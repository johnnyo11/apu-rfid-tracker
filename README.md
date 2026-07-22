# APU AV RFID Inventory

Next.js and Supabase inventory management for APU's Audio-Visual team.

## ESP32 Code
The file that contains the code for the ESP32 module is in the 
> hardware/esp32_rc522
folder

## Stored status convention

Status values are stored as lowercase words separated by spaces. Examples are
`available`, `reserved`, `in use`, and `under maintenance`. Run
`supabase/status_normalization.sql` once in the Supabase SQL Editor to convert
legacy underscore values and enforce the allowed values.

## ESP32 + RC522 scan integration

The ESP32 sends only the scanned tag UID to `POST /api/rfid/scan`. The server
matches it to `rfid_tags`, determines the next movement, and writes to
`scan_logs`. A scan after `checked_out` becomes `checked_in`; otherwise it
becomes `checked_out`. Repeated reads within three seconds are ignored.

Add these server-only values to `.env.local` and to Vercel:

```text
SUPABASE_SECRET_KEY=your-supabase-secret-key
RFID_DEVICE_SECRET=a-long-random-device-secret
```

Never prefix these values with `NEXT_PUBLIC_` and never put the Supabase secret
key on the ESP32. Only `RFID_DEVICE_SECRET` is copied into the device sketch.
Restart the development server after changing `.env.local`.

Configure `hardware/esp32_rc522/esp32_rc522.ino` with the Wi-Fi credentials,
API URL, and matching device secret. Install the Arduino `MFRC522` library before
uploading. For local testing, use the computer's LAN IP instead of `localhost`.
The computer and ESP32 must be on the same network, and the firewall must allow
the development server's port.

The endpoint expects `rfid_tags.tag_uid`, `tagged_id`,
`assigned_equipment_id`, and `status`, plus `scan_logs.rfid_tag_id`,
`movement_type`, and `scanned_at`.

RC522 UID bytes are represented as uppercase hexadecimal text such as
`A1B2C3D4`. Hex does not change the UID; it is a readable representation of the
same bytes.

## Getting Started

First, run the development server:

```bash
npm run dev
# or
yarn dev
# or
pnpm dev
# or
bun dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

You can start editing the page by modifying `app/page.tsx`. The page auto-updates as you edit the file.

This project uses [`next/font`](https://nextjs.org/docs/app/building-your-application/optimizing/fonts) to automatically optimize and load [Geist](https://vercel.com/font), a new font family for Vercel.

## Learn More

To learn more about Next.js, take a look at the following resources:

- [Next.js Documentation](https://nextjs.org/docs) - learn about Next.js features and API.
- [Learn Next.js](https://nextjs.org/learn) - an interactive Next.js tutorial.

You can check out [the Next.js GitHub repository](https://github.com/vercel/next.js) - your feedback and contributions are welcome!

## Deploy on Vercel

The easiest way to deploy your Next.js app is to use the [Vercel Platform](https://vercel.com/new?utm_medium=default-template&filter=next.js&utm_source=create-next-app&utm_campaign=create-next-app-readme) from the creators of Next.js.

Check out our [Next.js deployment documentation](https://nextjs.org/docs/app/building-your-application/deploying) for more details.
