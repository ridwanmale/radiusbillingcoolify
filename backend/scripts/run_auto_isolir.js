/**
 * Script untuk menjalankan auto-isolir PPPoE dengan redirect
 * Dijalankan via cron job atau scheduler
 */

const PPPoEAutoIsolir = require('../utils/pppoe_auto_isolir');

async function runAutoIsolir() {
  try {
    console.log('=== PPPoE Auto-Isolir dengan Redirect ===');
    console.log('Waktu:', new Date().toLocaleString('id-ID'));
    
    const autoIsolir = new PPPoEAutoIsolir();
    
    // 1. Check and isolir overdue customers
    const result = await autoIsolir.checkAndIsolirOverdueCustomers();
    
    console.log('Hasil:');
    console.log(`- Diproses: ${result.processed} pelanggan`);
    
    if (result.customers.length > 0) {
      console.log('- Pelanggan yang diisolir:');
      result.customers.forEach(c => {
        console.log(`  • ${c.name} (${c.username}) - ${c.days_overdue} hari overdue`);
      });
    } else {
      console.log('- Tidak ada pelanggan yang perlu diisolir');
    }
    
    // 2. Get statistics
    const stats = await autoIsolir.getRedirectStats();
    console.log('\nStatistik Redirect:');
    console.log(`- Total diisolir: ${stats.statistics.total_redirected || 0}`);
    console.log(`- Hari ini: ${stats.statistics.today_redirected || 0}`);
    console.log(`- Rata-rata overdue: ${stats.statistics.avg_days_overdue || 0} hari`);
    console.log(`- Maksimal overdue: ${stats.statistics.max_days_overdue || 0} hari`);
    
    console.log('\n=== Selesai ===');
    
    // Exit dengan success
    process.exit(0);
    
  } catch (error) {
    console.error('Error menjalankan auto-isolir:', error.message);
    console.error(error.stack);
    process.exit(1);
  }
}

// Jalankan jika di-execute langsung
if (require.main === module) {
  runAutoIsolir();
}

module.exports = runAutoIsolir;
