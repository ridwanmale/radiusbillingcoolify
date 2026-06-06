const puppeteer = require('puppeteer-core');

/**
 * Generate a PDF buffer from the frontend print page using a headless browser.
 * @param {string} batchId - The print code / batch ID to fetch vouchers for.
 * @param {string} templateId - The template ID to use.
 * @returns {Promise<Buffer>} The generated PDF file as a buffer.
 */
const generateVoucherPDF = async (batchId, templateId) => {
  let browser = null;
  try {
    // Determine the frontend URL. In Docker, it's usually http://frontend:80
    // Locally, it might be http://localhost:5173
    const isDocker = !!process.env.DB_HOST;
    const baseUrl = isDocker ? 'http://frontend:80' : 'http://localhost:5173';
    
    let url = `${baseUrl}/print?batch_id=${encodeURIComponent(batchId)}`;
    if (templateId) {
      url += `&template_id=${encodeURIComponent(templateId)}`;
    }

    const startTime = Date.now();
    console.log(`[PDF Generator] Launching Chromium to generate PDF for URL: ${url}`);
    
    // Launch headless Chromium (using the one installed in Alpine)
    browser = await puppeteer.launch({
      executablePath: process.env.PUPPETEER_EXECUTABLE_PATH || 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe', // Fallback for local Windows dev
      args: [
        '--no-sandbox',
        '--disable-setuid-sandbox',
        '--disable-dev-shm-usage', // Helps with low RAM
        '--disable-gpu',
        '--no-zygote',
        '--single-process'
      ],
      headless: 'new'
    });

    console.log(`[PDF Generator] Browser launched in ${Date.now() - startTime}ms`);
    const pageStartTime = Date.now();
    const page = await browser.newPage();
    
    // Set a realistic viewport
    await page.setViewport({ width: 1200, height: 800 });

    // Go to the URL and wait for the DOM to load
    await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 15000 }).catch(e => console.log('Goto timeout/error:', e.message));
    console.log(`[PDF Generator] Page loaded in ${Date.now() - pageStartTime}ms`);

    // Wait for the specific print template layout to be rendered to be totally sure
    const waitStartTime = Date.now();
    await page.waitForSelector('.print-page-layout', { timeout: 10000 }).catch(() => console.log('Timeout waiting for .print-page-layout'));
    console.log(`[PDF Generator] Selector found in ${Date.now() - waitStartTime}ms`);

    // We add an artificial delay to allow any fonts or images to finish rendering completely
    await new Promise(resolve => setTimeout(resolve, 1000));

    // Generate PDF (A4 format, no margins since the template handles it)
    console.log(`[PDF Generator] Rendering PDF...`);
    const renderStartTime = Date.now();
    const pdfBuffer = await page.pdf({
      format: 'A4',
      landscape: true,
      printBackground: true,
      margin: { top: '0px', right: '0px', bottom: '0px', left: '0px' },
      preferCSSPageSize: true // Respects @page { size: landscape; } if defined in CSS
    });

    console.log(`[PDF Generator] PDF successfully generated (${pdfBuffer.length} bytes) in ${Date.now() - renderStartTime}ms. Total time: ${Date.now() - startTime}ms`);
    return pdfBuffer;

  } catch (error) {
    console.error('[PDF Generator] Error generating PDF:', error);
    throw error;
  } finally {
    if (browser) {
      await browser.close();
    }
  }
};

module.exports = { generateVoucherPDF };
