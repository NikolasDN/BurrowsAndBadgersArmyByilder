# BurrowsAndBadgersArmyByilder

Burrows and Badgers 2th edition warband list builder

1. Create a static Angular application 

2. Use the source data in the xml from the data files (link below). Download the cat files, don’t clone them. Copy the extracted xml in the app

3. Create interfaces/models based on the xml, which follows the Battlescribe format.

4. Build the army builder web app

5. Make sure you can save and load armylists

6. Add print functionality. The printed page should have this layout, with the army data in the correct places: https://www.ospreypublishing.com/media/zwkjtbea/bb2e-band-roster.pdf

7. Deploy this as github page, using github actions



Data files (extract cat files same as zip, xml inside)
https://github.com/Westy661/Burrows-Badgers-Second-Edition

## Run locally

```bash
npm install
npm start
```

Open http://localhost:4200/

## Tests

```bash
npm test
```

## GitHub Pages

The workflow in `.github/workflows/deploy.yml` builds the Angular app and publishes `dist/bb-app/browser` to the `gh-pages` branch on every push to `main`.

After the first successful deploy, enable Pages in the repository settings:

- Source: **Deploy from a branch**
- Branch: `gh-pages` / root

The live app is then at:

https://NikolasDN.github.io/BurrowsAndBadgersArmyByilder/

Catalogue XML lives in `public/data/` (game system + faction catalogues from the New Recruit data files).
