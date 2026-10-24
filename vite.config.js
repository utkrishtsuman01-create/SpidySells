import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { fileURLToPath } from 'node:url';

const htmlEntry = (file) => fileURLToPath(new URL(file, import.meta.url));

export default defineConfig({
  plugins: [react()],
  build: {
    sourcemap: false,
    rollupOptions: {
      input: {
        index: htmlEntry('./index.html'),
        orderType: htmlEntry('./order-type.html'),
        menu: htmlEntry('./menu.html'),
        bag: htmlEntry('./bag.html'),
        checkout: htmlEntry('./checkout.html'),
        orderConfirmation: htmlEntry('./order-confirmation.html'),
        admin: htmlEntry('./admin.html')
      },
      output: {
        manualChunks(id) {
          if (!id.includes('node_modules')) return undefined;
          if (id.includes('/node_modules/@supabase/')) return 'supabase';
          if (id.includes('/node_modules/react/') || id.includes('/node_modules/react-dom/') || id.includes('/node_modules/scheduler/')) return 'react-vendor';
          return undefined;
        }
      }
    }
  }
});
