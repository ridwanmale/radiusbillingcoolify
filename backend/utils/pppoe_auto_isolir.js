/**
 * PPPoE Auto Isolir dengan Redirect Web Peringatan
 * Script untuk mengisolir pelanggan overdue dan mengaktifkan redirect
 */

const db = require('../config/db');
const axios = require('axios');

class PPPoEAutoIsolir {
  constructor() {
    this.redirectEnabled = true;
  }

  /**
   * Check for overdue customers and apply isolir with redirect
   */
  async checkAndIsolirOverdueCustomers() {
    try {
      console.log('[Auto-Isolir] Checking for overdue customers...');
      
      // Get customers with overdue invoices
      const [overdueCustomers] = await db.query(`
        SELECT 
          c.*,
          p.slug as package_slug,
          n.nasname as router_ip,
          n.api_user,
          n.api_password,
          n.api_port,
          DATEDIFF(NOW(), c.next_isolir_date) as days_overdue
        FROM pppoe_customers c
        LEFT JOIN pppoe_packages p ON c.package_id = p.id
        LEFT JOIN nas n ON c.router_id = n.id
        WHERE c.status = 'active'
          AND c.next_isolir_date IS NOT NULL
          AND c.next_isolir_date < NOW()
          AND (c.last_payment_date IS NULL OR c.last_payment_date < c.next_isolir_date)
        ORDER BY c.next_isolir_date ASC
      `);

      console.log(`[Auto-Isolir] Found ${overdueCustomers.length} overdue customers`);

      for (const customer of overdueCustomers) {
        await this.isolirCustomer(customer);
      }

      return {
        processed: overdueCustomers.length,
        customers: overdueCustomers.map(c => ({
          id: c.id,
          name: c.name,
          username: c.pppoe_username,
          days_overdue: c.days_overdue
        }))
      };

    } catch (error) {
      console.error('[Auto-Isolir] Error:', error.message);
      throw error;
    }
  }

  /**
   * Isolir a single customer with redirect
   */
  async isolirCustomer(customer) {
    const connection = await db.getConnection();
    
    try {
      await connection.beginTransaction();
      
      console.log(`[Auto-Isolir] Isoliring customer: ${customer.name} (${customer.pppoe_username})`);

      // 1. Update customer status to isolir
      await connection.query(
        'UPDATE pppoe_customers SET status = ?, days_overdue = ? WHERE id = ?',
        ['isolir', customer.days_overdue || 0, customer.id]
      );

      // 2. Change FreeRADIUS group to ISOLIR
      await connection.query(
        'UPDATE radusergroup SET groupname = ? WHERE username = ?',
        ['ARM_ISOLIR', customer.pppoe_username]
      );

      // 3. Add redirect attributes to radreply
      const [settings] = await connection.query(
        'SELECT * FROM pppoe_redirect_settings ORDER BY id DESC LIMIT 1'
      );
      
      const redirectSettings = settings.length > 0 ? settings[0] : {
        redirect_message: 'Mohon lunasi tagihan Anda',
        redirect_delay: 3
      };

      await connection.query(`
        INSERT INTO radreply (username, attribute, op, value) 
        VALUES (?, ?, ?, ?), (?, ?, ?, ?)
        ON DUPLICATE KEY UPDATE value = VALUES(value)
      `, [
        customer.pppoe_username, 'Reply-Message', '=', 
        `Account suspended. ${redirectSettings.redirect_message}. Please pay your bill.`,
        customer.pppoe_username, 'Mikrotik-Redirect-URL', ':=', 
        `http://${process.env.SERVER_HOST || 'localhost:5000'}/api/pppoe/warning-page`
      ]);

      // 4. Apply Mikrotik firewall rules if router supports API
      if (customer.router_ip && customer.api_user && customer.api_password) {
        try {
          await this.applyMikrotikRedirectRules(customer);
        } catch (mikrotikError) {
          console.error(`[Auto-Isolir] Mikrotik error for ${customer.name}:`, mikrotikError.message);
          // Continue even if Mikrotik fails
        }
      }



      // 5. Log the isolir action
      await connection.query(`
        INSERT INTO pppoe_redirect_logs 
        (customer_id, pppoe_username, action, details, ip_address)
        VALUES (?, ?, ?, ?, ?)
      `, [
        customer.id,
        customer.pppoe_username,
        'auto_isolir',
        JSON.stringify({
          days_overdue: customer.days_overdue,
          next_isolir_date: customer.next_isolir_date,
          redirect_enabled: this.redirectEnabled
        }),
        customer.router_ip || 'system'
      ]);

      // 6. Create isolir history record
      await connection.query(`
        INSERT INTO pppoe_history 
        (customer_id, action, details, admin_username)
        VALUES (?, ?, ?, ?)
      `, [
        customer.id,
        'auto_isolir',
        `Pelanggan diisolir otomatis karena tagihan overdue (${customer.days_overdue} hari)`,
        'system'
      ]);

      await connection.commit();
      console.log(`[Auto-Isolir] Successfully isolired customer: ${customer.name}`);

    } catch (error) {
      await connection.rollback();
      console.error(`[Auto-Isolir] Failed to isolir customer ${customer.name}:`, error.message);
      throw error;
    } finally {
      connection.release();
    }
  }

  /**
   * Apply Mikrotik firewall rules for redirect
   */
  async applyMikrotikRedirectRules(customer) {
    // Note: This is a simplified example
    // In production, you would use Mikrotik API library like routeros-api
    
    const mikrotikCommands = [
      `/ip firewall mangle add chain=prerouting src-address=${customer.pppoe_username} protocol=tcp dst-port=80 action=redirect to-ports=5000`,
      `/ip firewall filter add chain=forward src-address=${customer.pppoe_username} protocol=tcp dst-port=443 action=drop comment="Block HTTPS - Isolir ${customer.pppoe_username}"`,
      `/ip firewall filter add chain=forward src-address=${customer.pppoe_username} dst-port=5222,5223,5228 protocol=tcp action=drop comment="Block WhatsApp - Isolir ${customer.pppoe_username}"`,
      `/ip firewall filter add chain=forward src-address=${customer.pppoe_username} dst-port=3074,3478-3480,27000-27030 protocol=udp action=drop comment="Block Games - Isolir ${customer.pppoe_username}"`
    ];

    console.log(`[Auto-Isolir] Mikrotik commands for ${customer.name}:`, mikrotikCommands);

    // In real implementation, you would execute these via Mikrotik API
    // For now, we'll just log them
    await db.query(`
      INSERT INTO pppoe_redirect_logs 
      (customer_id, pppoe_username, action, details)
      VALUES (?, ?, ?, ?)
    `, [
      customer.id,
      customer.pppoe_username,
      'mikrotik_rules_applied',
      JSON.stringify({ commands: mikrotikCommands })
    ]);

    return mikrotikCommands;
  }

  /**
   * Remove isolir and redirect after payment
   */
  async removeIsolir(customerId) {
    const connection = await db.getConnection();
    
    try {
      await connection.beginTransaction();

      const [customer] = await connection.query(`
        SELECT c.*, n.nasname as router_ip, n.api_user, n.api_password
        FROM pppoe_customers c
        LEFT JOIN nas n ON c.router_id = n.id
        WHERE c.id = ?
      `, [customerId]);

      if (customer.length === 0) {
        throw new Error('Customer not found');
      }

      const cust = customer[0];

      console.log(`[Auto-Isolir] Removing isolir for: ${cust.name} (${cust.pppoe_username})`);

      // 1. Update customer status to active
      await connection.query(
        'UPDATE pppoe_customers SET status = ?, days_overdue = 0 WHERE id = ?',
        ['active', customerId]
      );

      // 2. Restore original FreeRADIUS group
      const [package] = await connection.query(
        'SELECT slug FROM pppoe_packages WHERE id = ?',
        [cust.package_id]
      );

      if (package.length > 0) {
        await connection.query(
          'UPDATE radusergroup SET groupname = ? WHERE username = ?',
          [package[0].slug, cust.pppoe_username]
        );
      }

      // 3. Remove redirect attributes
      await connection.query(
        'DELETE FROM radreply WHERE username = ? AND attribute IN (?, ?)',
        [cust.pppoe_username, 'Reply-Message', 'Mikrotik-Redirect-URL']
      );

      // 4. Remove Mikrotik firewall rules
      if (cust.router_ip && cust.api_user && cust.api_password) {
        try {
          await this.removeMikrotikRedirectRules(cust);
        } catch (mikrotikError) {
          console.error(`[Auto-Isolir] Mikrotik remove error:`, mikrotikError.message);
        }
      }

      // 5. Log the removal
      await connection.query(`
        INSERT INTO pppoe_redirect_logs 
        (customer_id, pppoe_username, action, details)
        VALUES (?, ?, ?, ?)
      `, [
        customerId,
        cust.pppoe_username,
        'remove_isolir',
        JSON.stringify({ reason: 'payment_received' })
      ]);

      // 6. Create history record
      await connection.query(`
        INSERT INTO pppoe_history 
        (customer_id, action, details, admin_username)
        VALUES (?, ?, ?, ?)
      `, [
        customerId,
        'remove_isolir',
        'Isolir dihapus setelah pembayaran diterima',
        'system'
      ]);

      await connection.commit();
      console.log(`[Auto-Isolir] Successfully removed isolir for: ${cust.name}`);

      return { success: true, message: 'Isolir removed successfully' };

    } catch (error) {
      await connection.rollback();
      console.error(`[Auto-Isolir] Failed to remove isolir:`, error.message);
      throw error;
    } finally {
      connection.release();
    }
  }

  /**
   * Remove Mikrotik firewall rules
   */
  async removeMikrotikRedirectRules(customer) {
    const removeCommands = [
      `/ip firewall mangle remove [find chain=prerouting src-address=${customer.pppoe_username} protocol=tcp dst-port=80]`,
      `/ip firewall filter remove [find chain=forward src-address=${customer.pppoe_username} protocol=tcp dst-port=443]`,
      `/ip firewall filter remove [find chain=forward src-address=${customer.pppoe_username} dst-port=5222,5223,5228]`,
      `/ip firewall filter remove [find chain=forward src-address=${customer.pppoe_username} dst-port=3074,3478-3480,27000-27030]`
    ];

    console.log(`[Auto-Isolir] Remove Mikrotik commands:`, removeCommands);

    await db.query(`
      INSERT INTO pppoe_redirect_logs 
      (customer_id, pppoe_username, action, details)
      VALUES (?, ?, ?, ?)
    `, [
      customer.id,
      customer.pppoe_username,
      'mikrotik_rules_removed',
      JSON.stringify({ commands: removeCommands })
    ]);

    return removeCommands;
  }

  /**
   * Get redirect statistics
   */
  async getRedirectStats() {
    try {
      const [stats] = await db.query(`
        SELECT 
          COUNT(DISTINCT customer_id) as total_redirected,
          COUNT(DISTINCT CASE WHEN DATE(created_at) = CURDATE() THEN customer_id END) as today_redirected,
          AVG(days_overdue) as avg_days_overdue,
          MAX(days_overdue) as max_days_overdue
        FROM pppoe_customers 
        WHERE status = 'isolir'
      `);

      const [recentActivity] = await db.query(`
        SELECT 
          DATE(created_at) as date,
          COUNT(*) as isolir_count,
          GROUP_CONCAT(DISTINCT pppoe_username) as customers
        FROM pppoe_redirect_logs 
        WHERE action = 'auto_isolir'
          AND created_at >= DATE_SUB(NOW(), INTERVAL 7 DAY)
        GROUP BY DATE(created_at)
        ORDER BY date DESC
      `);

      return {
        statistics: stats[0] || {},
        recent_activity: recentActivity,
        timestamp: new Date()
      };

    } catch (error) {
      console.error('[Auto-Isolir] Stats error:', error.message);
      throw error;
    }
  }
}

module.exports = PPPoEAutoIsolir;
