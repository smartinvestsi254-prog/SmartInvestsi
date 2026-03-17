# Contributing to SmartInvest-

Thanks for your interest in contributing! This project is a small static landing page — contributions that improve accessibility, content, SEO, or developer experience are welcome.

Getting started

- Fork the repository and create a branch named `feature/your-short-description` or `fix/issue-123`.
- Make your changes on the branch and keep commits focused and well-described.

Code style

- This is a static HTML/CSS project using the Tailwind CDN. Keep markup semantic and accessible.
- Use clear `id` and `aria-*` attributes for landmarks when appropriate.

Previewing locally

1. From the project root run:

```bash
python3 -m http.server 8000 --directory .
```

1. Open `http://localhost:8000/index.html` in your browser.

Testing & checks

- Run a quick HTML/JSON check by linting or using the browser devtools.
- Prefer automated accessibility checks (axe, Lighthouse) before opening a PR.

Pull request

- Open a PR against the `main` branch on the upstream repository.
- Describe the change, reference any issues, and include screenshots if the change affects visuals.

Reporting issues

- Open an issue for bugs or feature requests. Provide reproduction steps and, when possible, suggested fixes.

License

- Ensure any new assets or code you add include a compatible license or attribution.

Thank you for helping improve SmartInvest-!
