# Check Updates

## Introduction

When there are updates to the website, you might need to check for updates. The framework provides this functionality. By periodically checking for updates, you can configure the `checkUpdatesInterval` and `enableCheckUpdates` fields in your application's preferences.ts file to enable and set the interval for checking updates (in minutes).

By default the client fetches the build artifact `version.json` (a few dozen bytes) and compares the `id` fingerprint (hashed from this build's js/css filenames). Do not use the homepage `HEAD` `etag`: IIS static/dynamic compression can change etag and Content-Length without a real deploy. `localhost` / `127.0.0.1` are skipped.

```ts
import { defineOverridesPreferences } from '@vben/preferences';

export const overridesPreferences = defineOverridesPreferences({
  // overrides
  app: {
    // Whether to enable check for updates
    enableCheckUpdates: true,
    // The interval for checking updates, in minutes
    checkUpdatesInterval: 1,
  },
});
```

## Effect

When an update is detected, a prompt will pop up asking the user whether to refresh the page:

![check-updates](/guide/update-notice.png)

## Replacing with Other Update Checking Methods

If you need to check for updates in other ways, such as through an API to more flexibly control the update logic (such as force refresh, display update content, etc.), you can do so by modifying the `src/widgets/check-updates/check-updates.vue` file under `@vben/layouts`.

```ts
// Default already fetches version.json; replace this to use an API instead
async function getVersionTag() {
  const response = await fetch(`/version.json?_t=${Date.now()}`, {
    cache: 'no-cache',
  });
  const data = await response.json();
  return data.id || data.entry || null;
}
```
