# Contributing

Corrections and improvements are welcome, especially fixes to anything scientifically wrong or
overstated. Every fact in the app should be checkable, so please include a source.

- **Spotted a mistake?** Open an issue with what is wrong and a link to a reliable source.
- **Pull requests:** keep them focused. Run `npm test` first (see the README's *Test it* section).
  For how the code fits together, see [docs/architecture.md](docs/architecture.md).
- **New molecules** go in `tools/build_library.py`; run `npm run build:library` to regenerate
  `molecules.js` rather than editing it by hand.
