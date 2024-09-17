/*
 * Copyright 2022 Adobe. All rights reserved.
 * This file is licensed to you under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License. You may obtain a copy
 * of the License at http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software distributed under
 * the License is distributed on an "AS IS" BASIS, WITHOUT WARRANTIES OR REPRESENTATIONS
 * OF ANY KIND, either express or implied. See the License for the specific language
 * governing permissions and limitations under the License.
 */

/**
 * The decision engine for where to get Milo's libs from.
 */
export const [setLibs, getLibs] = (() => {
  let libs;
  return [
    (prodLibs, location) => {
      libs = (() => {
        const { hostname, search } = location || window.location;
        if (!['.hlx.', '.stage.', 'local'].some((i) => hostname.includes(i))) return prodLibs;
        const branch = new URLSearchParams(search).get('milolibs') || 'main';
        if (branch === 'local') return 'http://localhost:6456/libs';
        return branch.includes('--') ? `https://${branch}.hlx.live/libs` : `https://${branch}--milo--adobecom.hlx.live/libs`;
      })();
      return libs;
    }, () => libs,
  ];
})();

/*
 * ------------------------------------------------------------
 * Edit above at your own risk.
 * ------------------------------------------------------------
 */

/**
 * Builds a block DOM Element from a two dimensional array
 * @param {string} blockName name of the block
 * @param {any} content two dimensional array or string or object of content
 */
function buildBlock(blockName, content) {
  const table = Array.isArray(content) ? content : [[content]];
  const blockEl = document.createElement('div');

  blockEl.classList.add(blockName);
  table.forEach((row) => {
    const rowEl = document.createElement('div');
    row.forEach((col) => {
      const colEl = document.createElement('div');
      if (typeof col === 'string') {
        colEl.innerHTML = col;
      } else {
        colEl.appendChild(col);
      }
      rowEl.appendChild(colEl);
    });
    blockEl.appendChild(rowEl);
  });
  return (blockEl);
}

function getImageCaption(picture) {
  // Check if the parent element has a caption
  const parentEl = picture.parentNode;
  const caption = parentEl.querySelector('em');
  if (caption) return caption;

  // If the parent element doesn't have a caption, check if the next sibling does
  const parentSiblingEl = parentEl.nextElementSibling;
  if (!parentSiblingEl || !parentSiblingEl.querySelector('picture')) return '';
  const firstChildEl = parentSiblingEl.firstChild;
  if (firstChildEl?.tagName === 'EM') return firstChildEl;
  return '';
}

async function buildArticleHeader(el) {
  const miloLibs = getLibs();
  const { getMetadata, getConfig } = await import(`${miloLibs}/utils/utils.js`);
  const div = document.createElement('div');
  const h1 = el.querySelector('h1');
  const picture = el.querySelector('picture');
  const caption = getImageCaption(picture);
  const figure = document.createElement('div');
  figure.append(picture, caption);
  const author = getMetadata('author') || 'Adobe Communications Team';
  const { locale } = getConfig();
  const authorURL = getMetadata('author-url') || (author ? `${locale.contentRoot}/authors/${author.replace(/[^0-9a-z]/gi, '-').toLowerCase()}` : null);
  const publicationDate = getMetadata('publication-date');
  const articleHeaderBlockEl = buildBlock('article-header', [
    ['<p></p>'],
    [h1],
    [`<p><span ${authorURL ? `data-author-page="${authorURL}"` : ''}>${author}</span></p>
      <p>${publicationDate}</p>`],
    [figure],
  ]);
  div.append(articleHeaderBlockEl);
  el.prepend(div);
}

export async function buildAutoBlocks() {
  const miloLibs = getLibs();
  const { getMetadata } = await import(`${miloLibs}/utils/utils.js`);
  const mainEl = document.querySelector('main');
  try {
    if (getMetadata('publication-date') && !mainEl.querySelector('.article-header')) {
      await buildArticleHeader(mainEl);
    }
  } catch (error) {
    window.lana?.log(`Auto Blocking failed: ${error}`, { tags: 'autoBlock' });
  }
}
