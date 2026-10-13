const successBackground = new URL('./assets/success.png', import.meta.url).href;
const errorBackground = new URL('./assets/error.png', import.meta.url).href;
const template = document.createElement('template');

template.innerHTML = `
  <style>
    :host {
      display: block;
      max-width: 520px;
      margin: 20px 0;
      font-family: Impact, Haettenschweiler, "Arial Narrow Bold", sans-serif;
      color: #ffffff;
    }

    .card {
  position: relative;
  min-height: 250px;
  padding: 22px;
  border: 2px solid rgb(255 255 255 / 60%);
  border-radius: 16px;
  background-color: #26334a;
  background-image: var(--preview-background);
  background-size: cover;
  background-position: center;
  background-repeat: no-repeat;
  box-shadow: 0 6px 18px rgb(0 0 0 / 20%);
  overflow: hidden;
  overflow-wrap: anywhere;
  box-sizing: border-box;
}


    .label {
  margin: 18px 0 5px;
  color: #ffffff;
  font-size: 13px;
  text-transform: uppercase;
  letter-spacing: 0.06em;
  text-shadow: 1px 2px 4px rgb(0 0 0 / 80%);
}

    .value {
  margin: 0;
  color: #ffffff;
  font-size: 16px;
  line-height: 1.5;
  white-space: pre-wrap;
  text-shadow: 1px 2px 4px rgb(0 0 0 / 90%);
}

    a {
  display: inline-block;
  max-width: 100%;
  color: #ffffff;
  font-size: 24px;
  font-weight: normal;
  text-decoration: none;
  overflow-wrap: anywhere;
  text-shadow: 2px 2px 5px rgb(0 0 0 / 90%);
}

    a:hover {
      text-decoration: underline;
    }

    .status {
  margin-top: 20px;
  color: #ffffff;
  font-size: 14px;
  text-shadow: 1px 2px 4px rgb(0 0 0 / 90%);
}

    :host([data-status="error"]) .status {
      color: #ffd5d5;
    }
:host([data-status="ready"]) .card {
  --preview-background: url("SUCCESS_BACKGROUND");
}

:host([data-status="error"]) .card {
  --preview-background: url("ERROR_BACKGROUND");
}

:host([data-status="loading"]) .card {
  --preview-background: none;
  background-color: #64748b;
}
  </style>

  <article class="card">
    <a part="link" target="_blank" rel="noopener noreferrer"></a>

    <div class="label">Название документа</div>
    <p class="value"><span part="title"></span></p>

    <div class="label">Первый заголовок H1</div>
    <p class="value"><span part="heading"></span></p>

    <p class="status" part="status" role="status" aria-live="polite"></p>
  </article>
`;

class PagePreview extends HTMLElement {
  static observedAttributes = ['src'];

  constructor() {
    super();

    this.attachShadow({ mode: 'open' });
    this.shadowRoot.appendChild(template.content.cloneNode(true));

    this.linkElement = this.shadowRoot.querySelector('[part="link"]');
    this.cardElement = this.shadowRoot.querySelector('.card');
    this.titleElement = this.shadowRoot.querySelector('[part="title"]');
    this.headingElement = this.shadowRoot.querySelector('[part="heading"]');
    this.statusElement = this.shadowRoot.querySelector('[part="status"]');

    this.abortController = null;
    this.requestId = 0;
    this.lastRequestedSrc = undefined;
  }

  connectedCallback() {
    this.loadPage();
  }

  disconnectedCallback() {
    // Инвалидируем все запросы этого экземпляра и отменяем текущий.
    this.requestId += 1;
    this.abortController?.abort();
    this.abortController = null;
    this.lastRequestedSrc = undefined;
  }

  attributeChangedCallback(name, oldValue, newValue) {
    if (name !== 'src' || oldValue === newValue) {
      return;
    }

    // При первоначальном разборе HTML загрузка начнётся в connectedCallback.
    if (this.isConnected) {
      this.loadPage();
    }
  }

  setStatus(status, message) {
  this.dataset.status = status;
  this.statusElement.textContent = message;

  if (status === 'ready') {
    this.cardElement.style.backgroundImage =
      `url("${successBackground}")`;
  } else if (status === 'error') {
    this.cardElement.style.backgroundImage =
      `url("${errorBackground}")`;
  } else {
    this.cardElement.style.backgroundImage = 'none';
  }
}

  resetContent() {
    this.titleElement.textContent = 'Название отсутствует';
    this.headingElement.textContent = 'Заголовок отсутствует';
  }

  async loadPage() {
    const src = this.getAttribute('src');

    // Не запускаем повторный запрос для того же src.
    if (this.lastRequestedSrc === src) {
      return;
    }

    this.lastRequestedSrc = src;

    // Каждый новый запрос делает предыдущий устаревшим.
    const requestId = ++this.requestId;

    this.abortController?.abort();
    this.abortController = null;

    this.resetContent();

    if (!src || !src.trim()) {
      this.linkElement.removeAttribute('href');
      this.linkElement.textContent = 'Источник не указан';
      this.setStatus('error', 'Ошибка: атрибут src отсутствует.');
      return;
    }

    let url;

    try {
      // Относительный URL разрешается относительно страницы с компонентом.
      url = new URL(src, document.baseURI);
      this.linkElement.href = url.href;
      this.linkElement.textContent = url.href;
    } catch {
      this.linkElement.removeAttribute('href');
      this.linkElement.textContent = src;
      this.setStatus('error', 'Ошибка: некорректный URL.');
      return;
    }

    const controller = new AbortController();
    this.abortController = controller;

    this.setStatus('loading', 'Загрузка страницы…');

    try {
      const response = await fetch(url.href, {
        signal: controller.signal
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
      }

      const html = await response.text();

      // Проверяем, что элемент всё ещё подключён и запрос актуален.
      if (
        !this.isConnected ||
        requestId !== this.requestId ||
        this.getAttribute('src') !== src
      ) {
        return;
      }

      const parser = new DOMParser();
      const pageDocument = parser.parseFromString(html, 'text/html');

      const title = pageDocument.title.trim();
      const firstHeading = pageDocument.querySelector('h1');
      const heading = firstHeading
        ? firstHeading.textContent.trim()
        : '';

      this.titleElement.textContent =
        title || 'Название отсутствует';

      this.headingElement.textContent =
        heading || 'Заголовок отсутствует';

      // В видимом тексте ссылки используем название или URL.
      this.linkElement.textContent = title || url.href;

      this.setStatus('ready', 'Страница успешно загружена.');
    } catch (error) {
      // Отмена старого запроса не должна менять состояние нового.
      if (
        !this.isConnected ||
        requestId !== this.requestId ||
        this.getAttribute('src') !== src
      ) {
        return;
      }

      if (error.name === 'AbortError') {
        return;
      }

      this.setStatus(
        'error',
        `Не удалось загрузить страницу: ${error.message}`
      );
    } finally {
      if (requestId === this.requestId) {
        this.abortController = null;
      }
    }
  }
}

customElements.define('page-preview', PagePreview);
