# Temporary development dependency exception

Advisory: https://github.com/advisories/GHSA-fc5q-39xc-vjpf (CVE-2026-112366), reviewed/updated 17 November 2026. At review time all versions through picomatch 4.0.7 were affected and the advisory listed no patched version. npm reported 4.0.7 as latest. Do not force an apparent Vite downgrade suggested by npm audit: it does not establish that the underlying vulnerable matcher is fixed.

The web build uses picomatch transitively through Vite/tinyglobby/fdir. It is not a production dependency of the student application; the VPS serves prebuilt static files with Nginx and does not run Vite. The API production dependency audit is independently clean. The web production audit with --omit=dev is required to have zero vulnerabilities.

The reported denial of service requires attacker-controlled extglob patterns to reach the matcher. Aprueba does not pass student input into the build tooling. Local Vite is bound to loopback, CI builds repository sources without payment secrets, and the public application exposes no build or glob-evaluation endpoint. This is a scoped exposure assessment, not a claim that picomatch itself is fixed or safe for arbitrary untrusted patterns.

tools/auditDependencies.mjs checks both audits. It allows only advisories that resolve exclusively to the exact GHSA above, the exact affected range <=4.0.7 and the locked picomatch version 4.0.7, with zero vulnerabilities in the production audit. All other findings, registry failures, invalid reports and errors fail the check. The exception expires on 2 December 2026 UTC and fails CI after that date while the advisory remains. The warning is visible in CI; the full npm audit still reports the finding.

Remove the exception and update the dependency as soon as an official patched release is available. If the build is exposed to untrusted glob patterns or a public Vite server, this assessment no longer applies and the build must be isolated or changed before enabling that exposure.
