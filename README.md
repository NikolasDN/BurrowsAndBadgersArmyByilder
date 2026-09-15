# BurrowsAndBadgersArmyByilder

Burrows & Badgers 2nd Edition warband list builder.

A static Angular app that loads the community Battlescribe / New Recruit catalogues, lets you build and save warbands, and prints a band roster.

Catalogue XML lives in `public/data/` and comes from [Westy661/Burrows-Badgers-Second-Edition](https://github.com/Westy661/Burrows-Badgers-Second-Edition).

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

The workflow in `.github/workflows/deploy.yml` builds the app and publishes `dist/bb-app/browser` to the `gh-pages` branch on every push to `main`.

After the first successful deploy, enable Pages in the repository settings:

- Source: **Deploy from a branch**
- Branch: `gh-pages` / root

The live app is then at:

https://NikolasDN.github.io/BurrowsAndBadgersArmyByilder/
