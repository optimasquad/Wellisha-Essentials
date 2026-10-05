import {defineConfig} from '@playwright/test';
export default defineConfig({testDir:'./tests/browser',workers:1,timeout:60000,expect:{timeout:15000},
 use:{baseURL:'http://127.0.0.1:3002',headless:true,channel:'chrome',trace:'retain-on-failure'},
 webServer:{command:'npm run dev -- --hostname 127.0.0.1 --port 3002',url:'http://127.0.0.1:3002/products',reuseExistingServer:false,timeout:120000,
  env:{COMMERCE_API_URL:'http://127.0.0.1:3199',CHECKOUT_ENABLED:'true',NEXTAUTH_URL:'http://127.0.0.1:3002',NEXT_DIST_DIR:'.build',NEXT_TELEMETRY_DISABLED:'1'}},
});
