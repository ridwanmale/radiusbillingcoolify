import os
import re

def main():
    filepath = r"c:\Users\maula\OneDrive\Documents\my file\Ngoprek\radiusbillingcoolify\frontend\src\pages\PaymentBridgeCenter.jsx"
    with open(filepath, 'r', encoding='utf-8') as f:
        c = f.read()

    # 1. Fix duplicate className btn-glass-delete btn-danger-small
    c = c.replace('className="btn-glass-delete" onClick={() => handleDeleteTrx(trx.id)} className="btn-danger-small"', 'className="btn-glass-delete" onClick={() => handleDeleteTrx(trx.id)}')
    c = c.replace('className="btn-glass-delete" onClick={() => handleDeleteLog(log.id)} className="btn-danger-small"', 'className="btn-glass-delete" onClick={() => handleDeleteLog(log.id)}')
    c = c.replace('className="btn-glass-delete" onClick={() => handleDeleteDevice(device.id)} className="btn-danger-small"', 'className="btn-glass-delete" onClick={() => handleDeleteDevice(device.id)}')

    # 2. Fix duplicate className btn-glass-delete btn-glass on Auto-Delete
    c = c.replace('className="btn-glass-delete" \n              onClick={() => setIsAutoDeleteModalOpen(true)}\n              className="btn-glass"', 'className="btn-glass" \n              onClick={() => setIsAutoDeleteModalOpen(true)}')

    # 3. Replace Pagination
    pag1_old = """            {totalPagesTrx > 1 && (
              <div style={{ padding: '15px 20px', borderTop: '1px solid rgba(255,255,255,0.05)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ fontSize: '0.85rem', color: '#94a3b8' }}>Halaman {currentPageTrx} dari {totalPagesTrx}</span>
                <div style={{ display: 'flex', gap: '10px' }}>
                  <button 
                    onClick={() => setCurrentPageTrx(prev => Math.max(prev - 1, 1))}
                    disabled={currentPageTrx === 1}
                    className="btn-glass"
                    style={{ padding: '8px 15px', borderRadius: '8px', opacity: currentPageTrx === 1 ? 0.5 : 1, cursor: currentPageTrx === 1 ? 'not-allowed' : 'pointer' }}
                  >
                    Previous
                  </button>
                  <button 
                    onClick={() => setCurrentPageTrx(prev => Math.min(prev + 1, totalPagesTrx))}
                    disabled={currentPageTrx === totalPagesTrx}
                    className="btn-glass"
                    style={{ padding: '8px 15px', borderRadius: '8px', opacity: currentPageTrx === totalPagesTrx ? 0.5 : 1, cursor: currentPageTrx === totalPagesTrx ? 'not-allowed' : 'pointer' }}
                  >
                    Next
                  </button>
                </div>
              </div>
            )}"""
    
    pag1_new = """            {totalPagesTrx > 1 && (
              <div className="pagination-wrapper" style={{ marginTop: '15px' }}>
                <button className="pagination-btn" onClick={() => setCurrentPageTrx(prev => Math.max(prev - 1, 1))} disabled={currentPageTrx === 1}>Prev</button>
                <div className="pagination-text">{currentPageTrx} / {totalPagesTrx}</div>
                <button className="pagination-btn" onClick={() => setCurrentPageTrx(prev => Math.min(prev + 1, totalPagesTrx))} disabled={currentPageTrx === totalPagesTrx}>Next</button>
              </div>
            )}"""
            
    pag2_old = """            {totalPagesLogs > 1 && (
              <div style={{ padding: '15px 20px', borderTop: '1px solid rgba(255,255,255,0.05)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ fontSize: '0.85rem', color: '#94a3b8' }}>Halaman {currentPageLogs} dari {totalPagesLogs}</span>
                <div style={{ display: 'flex', gap: '10px' }}>
                  <button 
                    onClick={() => setCurrentPageLogs(prev => Math.max(prev - 1, 1))}
                    disabled={currentPageLogs === 1}
                    className="btn-glass"
                    style={{ padding: '8px 15px', borderRadius: '8px', opacity: currentPageLogs === 1 ? 0.5 : 1, cursor: currentPageLogs === 1 ? 'not-allowed' : 'pointer' }}
                  >
                    Previous
                  </button>
                  <button 
                    onClick={() => setCurrentPageLogs(prev => Math.min(prev + 1, totalPagesLogs))}
                    disabled={currentPageLogs === totalPagesLogs}
                    className="btn-glass"
                    style={{ padding: '8px 15px', borderRadius: '8px', opacity: currentPageLogs === totalPagesLogs ? 0.5 : 1, cursor: currentPageLogs === totalPagesLogs ? 'not-allowed' : 'pointer' }}
                  >
                    Next
                  </button>
                </div>
              </div>
            )}"""
            
    pag2_new = """            {totalPagesLogs > 1 && (
              <div className="pagination-wrapper" style={{ marginTop: '15px' }}>
                <button className="pagination-btn" onClick={() => setCurrentPageLogs(prev => Math.max(prev - 1, 1))} disabled={currentPageLogs === 1}>Prev</button>
                <div className="pagination-text">{currentPageLogs} / {totalPagesLogs}</div>
                <button className="pagination-btn" onClick={() => setCurrentPageLogs(prev => Math.min(prev + 1, totalPagesLogs))} disabled={currentPageLogs === totalPagesLogs}>Next</button>
              </div>
            )}"""

    c = c.replace(pag1_old, pag1_new)
    c = c.replace(pag2_old, pag2_new)

    with open(filepath, 'w', encoding='utf-8') as f:
        f.write(c)
        print("Updated successfully")

if __name__ == '__main__':
    main()
