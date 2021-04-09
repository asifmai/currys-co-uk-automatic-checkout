const pupHelper = require('./puppeteerhelper');
const keys = require('./keys');
const selectors = require('./selectors');
const moment = require('moment');

let found = false;
let running = false;

const run = async () => {
  try {
    await pupHelper.launchBrowser({ debug: true });

    tryToFind();
    setInterval(async () => {
      if (!found && !running) {
        await tryToFind();
      }
    }, 60000);
  } catch (error) {
    await pupHelper.closeBrowser();
    return error;
  }
};

const tryToFind = () =>
  new Promise(async (resolve, reject) => {
    let page;
    try {
      running = true;
      log('Trying to Find Products');
      page = await pupHelper.launchPage();
      await page.goto(keys.siteLink, { timeout: 0, waitUntil: 'load' });
      await clickCookies(page);

      const allProductsNodes = await page.$$(selectors.productsNodes);

      for (let i = 0; i < allProductsNodes.length; i++) {
        const productTitle = await allProductsNodes[i].$eval(selectors.productTitle, (elm) =>
          elm.innerText.trim().toLowerCase()
        );
        if (keys.productsList.some((product) => productTitle.includes(product.toLowerCase()))) {
          const productDetails = await page.evaluate((elm) => elm.innerText.trim().toLowerCase(), allProductsNodes[i]);
          if (!productDetails.includes('this item is out of stock')) {
            log('Found Product: ', productTitle);
            log('Checking out now...');
            found = true;
            const productLink = await allProductsNodes[i].$eval(selectors.productLink, (elm) => elm.href);
            await checkout(productLink);
            log('Checkout Complete...');
            process.exit(0);
          } else {
            console.log(`${i + 1}/${allProductsNodes.length} - OUT OF STOCK - ${productTitle}`);
          }
        }
      }

      await page.close();
      running = false;
      resolve(true);
    } catch (error) {
      if (page) await page.close();
      log(`tryToFind Error: ${error}`);
      reject(error);
    }
  });

const checkout = (url) =>
  new Promise(async (resolve, reject) => {
    let page;
    try {
      page = await pupHelper.launchPage();
      await page.goto(url, { timeout: 0, waitUntil: 'load' });

      await clickCookies(page);
      await page.waitForTimeout(2000);

      await page.waitForSelector(selectors.addToBasket);
      await page.click(selectors.addToBasket);

      await page.waitForSelector(selectors.continueToBasket);
      await page.click(selectors.continueToBasket);

      await page.waitForSelector(selectors.goToCheckout);
      await page.click(selectors.goToCheckout);

      // @todo - switch location input
      // await page.waitForSelector(selectors.useCurrentLocation);
      // await page.click(selectors.useCurrentLocation);
      // log('Clicked Use Current Locations');

      // @todo - switch location input
      await page.waitForSelector(selectors.locationInput);
      await page.focus(selectors.locationInput);
      await page.keyboard.type(keys.location);
      await page.waitForTimeout(5000);
      await page.keyboard.press('Enter');

      await page.waitForSelector(selectors.freeDeliveryButton);
      await page.click(selectors.freeDeliveryButton);

      await page.waitForSelector(selectors.emailInput);
      await page.focus(selectors.emailInput);
      await page.keyboard.type(keys.email);

      await page.waitForSelector(selectors.emailContinueButton);
      await page.click(selectors.emailContinueButton);

      await page.waitForSelector(selectors.formTitle);
      await page.click(selectors.formTitle);
      await page.waitForTimeout(1000);
      await page.keyboard.press('ArrowDown');
      await page.waitForTimeout(200);
      await page.keyboard.press('Enter');

      await page.type(selectors.formFirstName, keys.firstName, { delay: 50 });
      await page.type(selectors.formLastName, keys.lastName, { delay: 50 });
      await page.type(selectors.formPhoneNumber, keys.phone, { delay: 50 });
      await page.type(selectors.formAddress1, keys.address1, { delay: 50 });
      await page.type(selectors.formAddress2, keys.address2, { delay: 50 });
      await page.type(selectors.formCity, keys.city, { delay: 50 });
      await page.type(selectors.formCountry, keys.country, { delay: 50 });
      await page.click(selectors.formSubmitButton);

      await page.waitForSelector(selectors.creditCardButton);
      await page.click(selectors.creditCardButton);

      await page.waitForSelector(selectors.cardNumberInput);
      await page.type(selectors.cardNumberInput, keys.cardNumber, { delay: 50 });
      await page.type(selectors.cardNameInput, keys.cardName, { delay: 50 });
      await page.type(selectors.cardExpiryMonthInput, keys.cardExpiryMonth, { delay: 50 });
      await page.type(selectors.cardExpiryYearInput, keys.cardExpiryYear, { delay: 50 });
      await page.type(selectors.cardSecurityInput, keys.cardSecurity, { delay: 50 });
      await page.click(selectors.cardPayButton);
      await page.waitForTimeout(15000);

      await page.close();
      resolve(true);
    } catch (error) {
      if (page) await page.close();
      log(`Run Error: ${error}`);
      reject(error);
    }
  });

const clickCookies = (page) =>
  new Promise(async (resolve, reject) => {
    try {
      const gotCookies = await page.$(selectors.cookiesButton);
      if (gotCookies) {
        await page.click(selectors.cookiesButton);
      }

      resolve(true);
    } catch (error) {
      log('clickCookies Error: ', error);
      reject(error);
    }
  });

const log = (logText) => {
  const now = moment().format('MM-DD-YYYY HH:mm:ss A');
  console.log(now, '---', logText);
};

run();
