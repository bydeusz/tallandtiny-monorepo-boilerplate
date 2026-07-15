import { uiTranslations } from 'fumadocs-ui/i18n';
import { i18n } from './i18n';

// Nederlandse UI-labels. De sleutels komen exact uit fumadocs-ui's Translations-type
// (context-geannoteerde strings). Engels is ingebouwd via uiTranslations().
export const translations = i18n
  .translations()
  .extend(uiTranslations())
  .add({
    nl: {
      displayName: 'Nederlands',
      'Search(search dialog)': 'Zoeken',
      'Search(search trigger)': 'Zoeken',
      'Open Search(search trigger)(aria-label)': 'Zoeken openen',
      'Close Search(search dialog)(aria-label)': 'Zoeken sluiten',
      'No results found(search dialog)': 'Geen resultaten gevonden',
      'On this page(table of contents)': 'Op deze pagina',
      'No Headings(table of contents)': 'Geen koppen',
      'Table of Contents(inline table of contents)': 'Inhoudsopgave',
      'Last updated on(page footer)': 'Laatst bijgewerkt op',
      'Next Page(pagination)': 'Volgende',
      'Previous Page(pagination)': 'Vorige',
      'Choose a language(language switcher)': 'Taal kiezen',
      'Choose a language(language switcher)(aria-label)': 'Taal kiezen',
      'Toggle Theme(theme switcher)(aria-label)': 'Thema wisselen',
      'Light(theme switcher)(aria-label)': 'Licht',
      'Dark(theme switcher)(aria-label)': 'Donker',
      'System(theme switcher)(aria-label)': 'Systeem',
      'Toggle Menu(mobile menu)(aria-label)': 'Menu wisselen',
      'Collapse Sidebar(sidebar)(aria-label)': 'Zijbalk inklappen',
      'Open Sidebar(sidebar)(aria-label)': 'Zijbalk openen',
      'Close Banner(banner)(aria-label)': 'Banner sluiten',
      'Copy Text(code block)(aria-label)': 'Tekst kopiëren',
      'Copied Text(code block)(aria-label)': 'Tekst gekopieerd',
      'Copy Anchor Link(heading anchor)(aria-label)': 'Ankerlink kopiëren',
      'Copy Link(accordion)(aria-label)': 'Link kopiëren',
      'Edit on GitHub(edit page)': 'Bewerken op GitHub',
      'Copy Markdown(page actions)': 'Markdown kopiëren',
      'View as Markdown(page actions)': 'Bekijk als Markdown',
      'Open(page actions)': 'Openen',
      'Open in GitHub(page actions)': 'Openen in GitHub',
      'Open in Claude(page actions)': 'Openen in Claude',
      'Open in ChatGPT(page actions)': 'Openen in ChatGPT',
      'Open in Cursor(page actions)': 'Openen in Cursor',
      'Open in Scira AI(page actions)': 'Openen in Scira AI',
      'Read {url}, I want to ask questions about it.(page actions)':
        'Lees {url}, ik wil er vragen over stellen.',
      'Page Not Found(404 page)': 'Pagina niet gevonden',
      'Back to Home(404 page)': 'Terug naar home',
      'The page you are looking for might have been removed, had its name changed, or is temporarily unavailable.(404 page)':
        'De pagina die je zoekt is mogelijk verwijderd, hernoemd of tijdelijk niet beschikbaar.',
      'Type(type table)': 'Type',
      'Prop(type table)': 'Eigenschap',
      'Default(type table)': 'Standaard',
      'Parameters(type table)': 'Parameters',
      'Returns(type table)': 'Retourneert',
    },
  });
