<div align="center">

<h1>Quiet Yoast</h1>

<p><strong>Premium-Werbung in Yoast SEO Free ausblenden.</strong></p>

<p>Bereinigt die Oberfläche und zählt ausgeblendete Werbehinweise nicht mehr mit.</p>

<p>
  <a href="https://github.com/rktsky/wpplugin.quiet-yoast/releases/download/v1.1.0/rktsky-quiet-yoast-1.1.0.zip" target="_blank" rel="noopener noreferrer"><strong>↓ Plugin herunterladen · v1.1.0</strong></a>
  &nbsp; · &nbsp;
  <a href="https://github.com/rktsky/wpplugin.quiet-yoast/releases/tag/v1.1.0" target="_blank" rel="noopener noreferrer">Release ansehen</a>
</p>

<p><sub>Ein WordPress-Plugin von Rocketsky · GPL-2.0-or-later</sub></p>

</div>

---

## Vorher / Nachher

<table>
  <tr>
    <th width="50%">Ohne Quiet Yoast</th>
    <th width="50%">Mit Quiet Yoast</th>
  </tr>
  <tr>
    <td><a href="docs/screenshots/settings-before.jpg"><img src="docs/screenshots/settings-before.jpg" alt="Yoast-Einstellungen ohne Quiet Yoast: Premium-Karte rechts, Werbemenüs links und Site structure mit drei Funktionen." width="100%"></a></td>
    <td><a href="docs/screenshots/settings-after.jpg"><img src="docs/screenshots/settings-after.jpg" alt="Dieselbe Yoast-Ansicht mit Quiet Yoast: Premium-Karte und Werbemenüs entfernt, Site structure zählt die zwei verfügbaren Funktionen." width="100%"></a></td>
  </tr>
</table>

Die Aufnahmen zeigen dieselbe Testinstallation mit denselben geöffneten Bereichen bei gleicher Fenstergrösse. Links ist Quiet Yoast deaktiviert, rechts aktiviert. «Site structure» zählt danach die beiden verfügbaren Funktionen. Die kostenlosen Schalter bleiben erhalten. Klicke auf ein Bild für die volle Auflösung.

## Installation

1. Aktiviere die kostenlose Version von **Yoast SEO**.
2. Lade **`rktsky-quiet-yoast-1.1.0.zip`** über den Download oben herunter.
3. Öffne in WordPress **Plugins → Neues Plugin hinzufügen → Plugin hochladen** und installiere die ZIP-Datei.
4. Aktiviere **Rocketsky – Quiet Yoast** und lade bereits offene Verwaltungsseiten neu.

Es gibt keine Einstellungsseite. Für ein Update lädst Du die neue Installations-ZIP hoch und ersetzt die vorhandene Version. Die automatischen Quellcode-Archive im Release gehören zur Entwicklung.

## Was sich ändert

| Bereich | Wirkung |
| --- | --- |
| Navigation | Entfernt Werbeeinträge aus Yoast-Menü, Werkzeugliste, Toolbar und Pluginliste. |
| Einstellungen und Editor | Blendet Premium-Karten, gesperrte Funktionsteaser und Premium-KI-Schaltflächen aus. |
| Zähler | Zählt die tatsächlich ausgeblendeten Werbezeilen nicht mehr mit, auch nach Neuberechnungen und beim Ein-/Ausklappen. |
| Social-Vorschau | Entfernt die gesperrte Premium-Vorschau; verfügbare Felder für Bild, Titel und Beschreibung bleiben bedienbar. |

Echte SEO- und Lesbarkeitsbewertungen bleiben unverändert. Support, die auch kostenlos nutzbare Academy sowie Konto- und Lizenzinformationen bleiben erreichbar.

## Eigenständige Erweiterung

WordPress, Yoast und andere Drittdateien werden nicht verändert. Quiet Yoast verwendet WordPress-Hooks und eigene CSS-/JavaScript-Dateien. Es speichert keine Einstellungen und stellt keine eigenen externen Verbindungen her. CSS und JavaScript laden nur in den betroffenen Verwaltungsansichten.

Deaktivieren und neu laden stellt die normale Oberfläche wieder her. Mit aktivem Yoast SEO Premium greift die Bereinigung nicht.

<details>
<summary><strong>Voraussetzungen, Prüfstand und Grenzen</strong></summary>

Das Plugin benötigt mindestens WordPress 6.5 und PHP 7.4. Zusätzlich gelten die Systemvoraussetzungen Deiner Yoast-Version; Yoast SEO 28.8 benötigt WordPress ab 7.0. Für die CSS-Regeln ist ein aktueller Browser nötig.

Geprüft mit **WordPress 7.1.4, Yoast SEO Free 28.8 und PHP 8.3.36**. Lokal bestehen 53 WordPress-Integrationsprüfungen, 35 DOM-Prüfungen und 5 PHP-/Schutzprüfungen. Die Oberfläche wurde zusätzlich im Classic Editor und Blockeditor sowie bei schmalen Ansichten kontrolliert. Die aktuelle GitHub-Ausführung findest Du unter <a href="https://github.com/rktsky/wpplugin.quiet-yoast/actions" target="_blank" rel="noopener noreferrer">Actions</a>.

Yoast bietet keinen Gesamtschalter für seine Premium-Werbung. Deshalb beziehen sich CSS und Zählerkorrektur auf die geprüfte Oberflächenstruktur. Nach Yoast-Updates können Anpassungen nötig werden. Unbekannte Strukturen behalten ihre ursprünglichen Zähler; ein zuerst geschlossen dargestellter Bereich wird erst korrigiert, sobald seine Zeilen geprüft werden konnten.

Der vollständige [Testnachweis](docs/verification.txt) beschreibt auch die nicht geprüften Plattformen und Erweiterungen. Die verwendeten [Schnittstellen und Darstellungsverträge](docs/interfaces.txt) sind separat dokumentiert.

</details>

## Entwicklung

Der installierte WordPress-Teil benötigt weder Node.js noch npm. Für die isolierten Entwicklungsprüfungen verwendest Du Node.js 24:

```sh
npm ci --ignore-scripts --no-audit --no-fund
npm test
```

[Testaufbau und Wartung](tests/README.md) · [Repository und Release-Paket](docs/repository.txt) · [Lizenz](LICENSE.txt)
