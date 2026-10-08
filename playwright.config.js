import {defineConfig} from '@playwright/test';
// 用户使用主入口时，验证指向独立端口和缓存，避免争抢抽帧单任务。
export default defineConfig({testDir:'./tests/browser',timeout:60000,expect:{timeout:20000},workers:1,use:{baseURL:process.env.FRAMES_TEST_URL || 'http://127.0.0.1:8897',channel:'chrome',headless:true,viewport:{width:1440,height:1000}},reporter:'list'});
