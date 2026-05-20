#!/bin/bash
cd /home/localhost8081/wastelink/frontend
npm install tailwindcss@3.4.17 autoprefixer@10.4.19 postcss@8.4.38 --save-dev --legacy-peer-deps --no-fund --no-audit
echo "Installation complete"
npm run dev
