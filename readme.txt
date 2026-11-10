=== Rocketsky – Quiet Yoast ===
Tags: yoast, admin, premium, upsell
Requires at least: 6.5
Requires PHP: 7.4
Requires Plugins: wordpress-seo
Tested up to: 7.1
Stable tag: 1.2.0
License: GPL-2.0-or-later
License URI: https://www.gnu.org/licenses/gpl-2.0.html

Blendet Premium-Werbung in der kostenlosen Version von Yoast SEO aus.

== Beschreibung ==

Aktivieren genügt. Das Plugin hat keine Einstellungsseite.

Es bereinigt Werbeeinträge im Yoast-Menü, in der Werkzeug-Navigation, in der
Toolbar und in der Pluginliste. Gezieltes CSS blendet Premium-Karten, gesperrte
Premium-Vorschauen, zusätzliche Keyphrasen, interne Verlinkungsvorschläge,
Premium-Analysewerbung und gesperrte KI-Optimierungsschaltflächen aus.
Auch die Premium-Werbezeile unter der Aufgabenliste wird ausgeblendet; die
eigentlichen Aufgaben und deren Fortschrittsanzeige bleiben erhalten.

Die angezeigten Funktions- und Problemzähler berücksichtigen diese versteckten
Werbezeilen nicht mehr. Dafür lädt das Plugin eine kleine eigene JavaScript-Datei
in den Einstellungen und Inhaltseditoren. Bereiche, die nur Werbung enthalten,
werden vollständig ausgeblendet. Echte Analyseergebnisse zählen weiterhin.

Die kostenlosen SEO-Felder, Analysen, Social-Metadaten, Support und die auch
kostenlos nutzbare Academy bleiben verfügbar. Die Seite «Plans» bleibt erhalten,
damit Konto- und Lizenzinformationen erreichbar bleiben.

WordPress, Yoast und andere Drittdateien werden nicht verändert. Das Plugin
speichert keine Einstellungen. Bei der Updateprüfung fragt es GitHub ab und
speichert das Ergebnis vorübergehend im WordPress-Zwischenspeicher. Sein CSS
lädt nur in Yoast-Verwaltungsansichten und Beitrags- beziehungsweise
Taxonomie-Editoren. Auf öffentlichen Seiten werden
lediglich Werbeeinträge aus einer vorhandenen Toolbar entfernt; es werden keine
öffentlichen CSS- oder JavaScript-Dateien ergänzt.

== Installation ==

1. Die kostenlose Version von Yoast SEO installieren und aktivieren.
2. Unter «Plugins > Neues Plugin hinzufügen > Plugin hochladen» die ZIP-Datei
   rktsky-quiet-yoast-1.2.0.zip auswählen.
3. Installieren und «Rocketsky – Quiet Yoast» aktivieren.
4. Bereits geöffnete Verwaltungsseiten neu laden.

Zusätzlich zu den Mindestanforderungen dieses Plugins gelten diejenigen Deiner
Yoast-Version. Die geprüfte Version Yoast SEO 28.8 benötigt WordPress ab 7.0.

== Updates ==

Wenn Du Quiet Yoast 1.1.1 oder älter installiert hast, lade die Installations-ZIP
für 1.2.0 einmal hoch und bestätige, dass WordPress die installierte Version
ersetzen soll.

Solange Quiet Yoast aktiv ist, prüft es bei der normalen WordPress-Updateprüfung,
ob auf GitHub eine neuere stabile Version verfügbar ist. Klicke dann in der
Pluginliste bei Quiet Yoast auf «Jetzt aktualisieren». WordPress lädt und
installiert die ZIP-Datei aus dem GitHub-Release. Automatische Updates kannst Du
in derselben Pluginliste aktivieren.

== Grenzen ==

Die Darstellung wurde für Yoast SEO 28.8 geprüft. Yoast stellt keinen
dokumentierten Gesamtschalter für seine Premium-Werbung bereit. Deshalb nutzt
dieses Plugin dokumentierte WordPress-APIs, den im Originalquellcode beschriebenen
öffentlichen Yoast-Menüfilter sowie eigene CSS- und JavaScript-Dateien. Die
Selektoren und die verwendete Oberflächenstruktur sind keine zugesicherte
Yoast-Schnittstelle und können nach einem Yoast-Update eine Anpassung benötigen.

Die Zählerkorrektur zählt bestätigte ausgeblendete Werbezeilen. Sie erhält auch
beim Einklappen die zuvor geprüfte Anzahl und reagiert auf Neuberechnungen. Die
tatsächlichen SEO- und Lesbarkeitsbewertungen werden nicht verändert. Bei einer
unbekannten Oberflächenstruktur bleibt die von Yoast ausgegebene Zahl stehen.
Dasselbe gilt für einen bereits beim ersten Aufruf eingeklappten Bereich, bis dessen Zeilen
erstmals geprüft werden konnten. Yoast 28.8 öffnet die Funktionsbereiche beim
Aufrufen der Seite standardmässig und speichert diesen Zustand nicht dauerhaft.

Aus dem Menüfilter entfernte Werbeseiten können nicht mehr direkt registriert
sein. Das Plugin erteilt oder entzieht keine Benutzerberechtigungen.

Mit aktivem Yoast SEO Premium greift die Bereinigung nicht. Es werden keine
Premium-Funktionen freigeschaltet. Andere Editor-Erweiterungen und sämtliche
künftigen Werbevarianten sind nicht pauschal abgedeckt.

Für CSS :has() ist ein aktueller Browser nötig. Ältere Browser ignorieren diese
Regeln und können dadurch einzelne Werbeflächen weiterhin anzeigen.

== Deaktivierung und Deinstallation ==

Deaktivieren und die Verwaltungsseite neu laden, um die normale Darstellung
wiederherzustellen. Danach kannst Du das Plugin über die Pluginverwaltung
löschen. Die zwischengespeicherten Release-Daten laufen automatisch ab.

== Prüfung ==

Native Integration: WordPress 7.1.4, Yoast SEO 28.8, PHP 8.3.36 in einer isolierten
WordPress-Playground-Umgebung mit SQLite. PHP-7.4-Syntax zusätzlich geprüft.
Browserprüfungen: Chromium im In-App-Browser auf macOS, Classic Editor und
Blockeditor; Einstellungsansicht bei 320, 390, 768 und 1440 CSS-Pixeln.

Weitere Quellen, Tests und bewusst offene Prüfungen: docs/interfaces.txt und
docs/verification.txt. Das Paket enthält weder WordPress/Yoast noch Testwerkzeuge.

== Changelog ==

= 1.2.0 =
Stabile GitHub-Releases erscheinen in der WordPress-Pluginverwaltung. WordPress
lädt die passende Installations-ZIP beim Aktualisieren direkt von GitHub.

= 1.1.1 =
Verbliebene Premium-Werbezeile unter der Aufgabenliste ausgeblendet. Aufgaben,
Fortschritt und kostenlose Bedienelemente bleiben unverändert. Acht ergänzende
Darstellungsprüfungen sichern die Begrenzung auf diese Werbezeile ab.

= 1.1.0 =
Angezeigte Funktions- und Problemzähler um bestätigte versteckte Werbezeilen
bereinigt. Nur aus Werbung bestehende Bereiche ausgeblendet. Dynamische
Neuberechnungen, Ein-/Ausklappen und Einstellungsseitenwechsel berücksichtigt.

= 1.0.0 =
Erste Version mit Menübereinigung und gezieltem CSS für die gezeigten Premium-
Werbeflächen in Yoast SEO Free 28.8.
