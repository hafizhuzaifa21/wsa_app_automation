import allureReporter from "@wdio/allure-reporter";
import { step } from "../../utils/helpers";
import {
  forceStopApp,
  setAirplaneMode,
  setConnectivity,
} from "../../utils/connectivity";
import { LoginPage } from "../../pages/login.page";

describe.skip("App Foundation - Offline", () => {
  const loginPage = new LoginPage();
  const appPackage = "com.wsa.netball.dev";

  it("[APP-008, 005] Offline banner appears on connectivity loss and clears on reconnection, App shell renders without crash on cold start while offline", async () => {
    allureReporter.addFeature("App Foundation");
    allureReporter.addStory(
      "APP-008 - Offline banner on connectivity change, APP-005 - Cold start offline",
    );
    allureReporter.addSeverity("high");

    await step("Verify welcome screen is visible", async () => {
      await loginPage.validateLoginBtnIsVisible();
    });

    await step("2. Disable connectivity on the device", async () => {
      await setConnectivity("disable");
    });

    await step("3. Observe offline banner", async () => {
      await loginPage.waitUntilVisible(loginPage.offlineBanner);
      await loginPage.assertElementDisplayed(loginPage.offlineBanner);
    });

    await step("4. Restore connectivity", async () => {
      await setConnectivity("enable");
    });

    await step("5. Verify offline banner is removed", async () => {
      await forceStopApp("com.wsa.netball.dev");
      await driver.activateApp("com.wsa.netball.dev");
      await loginPage.waitUntilVisibleWithRetry(loginPage.loginButton, 5);
      await loginPage.waitUntilInvisibleWithRetry(loginPage.offlineBanner);
    });

    //[APP-005] App shell renders without crash on cold start while offline
    await step("1. Put the device in airplane mode", async () => {
      await setAirplaneMode(true);
    });

    await step("2. Cold start the app", async () => {
      await forceStopApp(appPackage);
      await driver.activateApp(appPackage);
    });

    await step("3. Observe the app shell renders without crash", async () => {
      await loginPage.waitUntilVisibleWithRetry(loginPage.loginButton);
      await loginPage.assertElementDisplayed(loginPage.loginButton);
    });

    await step("Cleanup: disable airplane mode", async () => {
      await setAirplaneMode(false);
    });
  });
});
