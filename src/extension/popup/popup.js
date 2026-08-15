(function (LD) {
  'use strict';

  var statusNode = document.getElementById('status');
  var primaryButton = document.getElementById('primary');
  var optionsButton = document.getElementById('options');
  var activeTab = null;
  var contentStatus = null;

  LD.i18n.localizeDocument(document);

  function setStatus(text) {
    statusNode.textContent = text;
  }

  async function loadStatus() {
    try {
      var tabs = await LD.webext.queryTabs({ active: true, currentWindow: true });
      activeTab = tabs && tabs[0] ? tabs[0] : null;
      if (!activeTab || typeof activeTab.id !== 'number') throw new Error('No active tab');
      contentStatus = await LD.webext.sendTabMessage(activeTab.id, { type: LD.constants.messageTypes.getStatus });
      if (contentStatus && contentStatus.editable) {
        setStatus(LD.i18n.t('profileDetected'));
        primaryButton.textContent = LD.i18n.t('openEditor');
      } else {
        setStatus(LD.i18n.t('profileNotDetected'));
        primaryButton.textContent = LD.i18n.t('openLinkedIn');
      }
    } catch {
      contentStatus = null;
      setStatus(LD.i18n.t('unavailable'));
      primaryButton.textContent = LD.i18n.t('openLinkedIn');
    }
  }

  primaryButton.addEventListener('click', async function () {
    primaryButton.disabled = true;
    try {
      if (activeTab && contentStatus && contentStatus.editable) {
        await LD.webext.sendTabMessage(activeTab.id, { type: LD.constants.messageTypes.openEditor });
      } else {
        await LD.webext.createTab({ url: 'https://www.linkedin.com/in/me/' });
      }
      window.close();
    } catch {
      primaryButton.disabled = false;
      setStatus(LD.i18n.t('unavailable'));
    }
  });

  optionsButton.addEventListener('click', async function () {
    await LD.webext.openOptionsPage();
    window.close();
  });

  loadStatus();
})(globalThis.LinkedDraw = globalThis.LinkedDraw || {});
