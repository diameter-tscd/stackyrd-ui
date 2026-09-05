# Security Policy

## Supported Versions

We actively support the latest release with security updates. The project is in early development and receives updates on the `master` branch.

| Version | Supported |
|---------|-----------|
| latest  | ✅        |

## Reporting a Vulnerability

To report a security vulnerability, please open a [security advisory](https://github.com/diameter-tscd/stackyrd-ui/security/advisories/new) on GitHub. Include:

- A description of the vulnerability
- Steps to reproduce (or proof of concept)
- Potential impact assessment
- Any suggested fixes (if available)

You should receive a response within 72 hours. If the vulnerability is accepted, we will work on a fix and coordinate disclosure.

## What Is In Scope

- Authentication bypass or credential exposure in the dashboard
- XSS via user-controlled data in Svelte components
- SSRF or open redirect via the Vite proxy configuration
- Dependency vulnerabilities affecting runtime behavior

## What Is Out of Scope

- Issues in upstream dependencies (report to the respective project)
- Social engineering attacks against maintainers
- Denial of service via resource exhaustion (unless novel)

## Security Best Practices for Contributors

- Never commit secrets, tokens, or credentials to the repository
- Use the `.env` file for local configuration — it is gitignored
- Validate and sanitize all data received from the backend API
- Follow Svelte's built-in XSS protections — avoid `@html` with untrusted content
- Keep dependencies updated — run `npm audit` regularly

## Disclosure Policy

We follow responsible disclosure. Once a fix is deployed, we will publicly disclose the vulnerability and credit the reporter (unless they prefer to remain anonymous).
