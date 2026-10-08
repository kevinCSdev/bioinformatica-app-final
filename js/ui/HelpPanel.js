/** Vista de lectura independiente: oculta, pero no desmonta, el laboratorio. */
export class HelpPanel {
  constructor({ opener, view, workspace, sidebar, title, returnButton, pause }) {
    this.active = false;
    this.opener = opener;
    this.view = view;
    this.workspace = workspace;
    this.sidebar = sidebar;
    this.title = title;
    this.pause = pause;
    opener.addEventListener('click', () => this.open());
    returnButton.addEventListener('click', () => this.close());
  }

  open() {
    if (this.active) return;
    this.active = true;
    this.pause();
    this.workspace.hidden = true;
    this.sidebar.inert = true;
    this.view.hidden = false;
    this.opener.setAttribute('aria-expanded', 'true');
    this.title.focus();
  }

  close() {
    if (!this.active) return;
    this.active = false;
    this.view.hidden = true;
    this.workspace.hidden = false;
    this.sidebar.inert = false;
    this.opener.setAttribute('aria-expanded', 'false');
    // Pausar no implica reanudar: el estudiante decide cuándo continuar.
    this.opener.focus();
  }
}
