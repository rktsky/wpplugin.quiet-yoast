# Entwicklungsprüfungen

Diese Dateien gehören zur Entwicklung und werden nicht in das installierbare Plugin-ZIP übernommen. Das Plugin selbst braucht weder Node.js noch npm oder diese Pakete.

## Ausführen

Voraussetzung ist Node.js 24. Aus dem Repository:

```sh
npm ci --ignore-scripts --no-audit --no-fund
npm test
```

`npm run test:native` führt die WordPress-Integration und die PHP-Schutzprüfungen aus. Der Teststarter aktiviert die für das festgelegte PHP-WASM-Paket benötigte Node-Option `--experimental-wasm-jspi`. `npm run test:dom` prüft separat die Darstellung mit der tatsächlichen CSS- und JavaScript-Datei.

Für einen separaten Quellordner kann `QUIET_YOAST_PLUGIN_DIR` auf dessen absoluten Pfad gesetzt werden. Im normalen Repository bleibt diese Variable ungesetzt. Die Tests verwenden den Ordner mit `rktsky-quiet-yoast.php`, `includes/` und `assets/`.

## Festgelegte Testumgebung

- WordPress 7.1.4 und Yoast SEO 28.8 aus den offiziellen, versionierten ZIP-Downloads.
- Offizieller WordPress Playground 3.1.62 mit einer flüchtigen SQLite-Datenbank und PHP 8.3.36 für die Integration.
- PHP 7.4.34-dev aus demselben festgelegten Playground-Paket für die Syntax- und Schutzprüfungen. Diese WASM-Version ist keine Aussage über eine vollständig getestete native PHP-7.4-Installation.
- jsdom 31.0.0 für die DOM-Prüfungen mit tatsächlichem CSS und JavaScript; ohne Ersatz für `getComputedStyle`.

Versionen, Download-URLs und SHA-256 stehen in `providers.json`. Jeder Zugriff auf einen heruntergeladenen Cache prüft dessen Hash erneut. Ein Unterschied bricht den Test ab. Neue Anbieter-Versionen brauchen eine bewusste Aktualisierung des Manifests und eine erneute Prüfung ihrer Schnittstellen und Markup-Verträge.

Die Archive werden nur in `.cache/test-runtime/` gespeichert. WordPress und Yoast werden daraus unverändert im Speicher entpackt. Es wird kein Webserver gestartet. Die Testinstanz blockiert externe WordPress-HTTP-Anfragen, Cron und E-Mail-Versand. Cookies und Benutzerkonten entstehen neu innerhalb jeder Testinstanz; das Passwort des zusätzlichen Editor-Kontos wird zur Laufzeit erzeugt. Es werden keine realen Zugangsdaten verwendet.

## Umfang und Grenzen

Die WordPress-Prüfung umfasst echte Plugin-Aktivierung, Abhängigkeitsprüfung, authentifizierte Verwaltungsanfragen, Menüs und Toolbar, Editor-Berechtigungen, gezieltes Entfernen des Premium-Links, ähnliche URLs als Gegenproben, Asset-Registrierung und den Vergleich der öffentlichen Ausgabe mit und ohne Plugin. Sie prüft die native Registrierung des Zähler-Skripts mit leerer Abhängigkeitsliste, Version 1.1.0, Footer-Gruppe und `defer` sowie dessen Beschränkung auf die vorgesehenen Seiten.

Die DOM-Prüfung umfasst neue und wiederverwendete Zähler, Ein- und Ausklappen, unbekannte Strukturen, geänderte ARIA- und Screenreader-Zustände, unveränderte SVG-/Text-Knoten, echte Prüfungen mit gesperrten AI-Schaltflächen und reine Werbebereiche. Sie ersetzt keine Prüfung in einem echten Browser mit laufendem Yoast-React-Code. Die Premium-Schutzprüfung simuliert nur die Anbieter-Konstanten; ein kommerzielles Premium-Paket ist nicht enthalten.

Der verifizierte Ausgangsstand 1.1.0 umfasst 53 WordPress-Integrationsprüfungen, 35 DOM-Prüfungen und 5 PHP-/Schutzprüfungen. Die Ausgangsprüfung erfolgte lokal auf macOS mit Node 24.22.1. GitHub Actions muss auf Linux separat erfolgreich laufen, bevor dessen Ergebnis behauptet werden darf. Es werden keine Produktions-, Geräte-, Last- oder vollständigen WordPress-Plugin-Check-Prüfungen daraus abgeleitet.

Kompakte Ergebnisdateien entstehen unter `test-results/`; sie enthalten keine HTML-Seiten, Nonces, Cookie-Header oder gespeicherten Sitzungen. `.gitignore` schliesst Ergebnisse, Archive, Cache und installierte Entwicklungspakete aus. Die CI lädt diese Dateien nicht als Artefakte hoch.

## Wartung

Funktionale Änderungen mit den nativen Prüfungen und den betreffenden Regressionen gemeinsam ändern. CSS und die Darstellungsprüfungen getrennt davon prüfen und committen. Bei Änderungen an Yoast-Markup zusätzlich Einstellungen, Classic Editor und Block Editor im echten Browser prüfen. Vor einer Veröffentlichung bleiben das freigegebene Plugin-ZIP und dessen enthaltene Dateien gesondert zu kontrollieren.

Grundlagen: [WordPress Playground](https://developer.wordpress.org/playground/developers/local-development/wp-playground-cli/), [WordPress-Plugin-Handbuch](https://developer.wordpress.org/plugins/) und [WordPress-Skripte einbinden](https://developer.wordpress.org/reference/functions/wp_enqueue_script/).
