import test from 'node:test';
import assert from 'node:assert/strict';
import { loadNamespace } from './load-namespace.mjs';

test('destructive cover actions are explicitly localized in English and Ukrainian', async () => {
  const English = await loadNamespace(['shared/i18n.js'], { navigator: { language: 'en-US' } });
  const Ukrainian = await loadNamespace(['shared/i18n.js'], { navigator: { language: 'uk-UA' } });

  assert.equal(English.i18n.t('deleteCover'), 'Delete cover');
  assert.equal(English.i18n.t('deleteCoverConfirm'), 'Delete the current cover from LinkedIn?');
  assert.equal(Ukrainian.i18n.t('deleteCover'), 'Видалити обкладинку');
  assert.equal(Ukrainian.i18n.t('deleteCoverConfirm'), 'Видалити поточну обкладинку з LinkedIn?');
});

test('canvas reset, close semantics, and safe-area labels are localized in both languages', async () => {
  const English = await loadNamespace(['shared/i18n.js'], { navigator: { language: 'en-US' } });
  const Ukrainian = await loadNamespace(['shared/i18n.js'], { navigator: { language: 'uk-UA' } });

  assert.equal(English.i18n.t('clear'), 'Clear canvas');
  assert.equal(English.i18n.t('cancel'), 'Close without changes');
  assert.equal(English.i18n.t('visibleCoverArea'), 'visible cover');
  assert.equal(English.i18n.t('profilePhotoArea'), 'profile photo');
  assert.equal(English.i18n.t('coverControlsArea'), 'cover controls');

  assert.equal(Ukrainian.i18n.t('clear'), 'Очистити канву');
  assert.equal(Ukrainian.i18n.t('cancel'), 'Закрити без змін');
  assert.equal(Ukrainian.i18n.t('visibleCoverArea'), 'видима обкладинка');
  assert.equal(Ukrainian.i18n.t('profilePhotoArea'), 'фото профілю');
  assert.equal(Ukrainian.i18n.t('coverControlsArea'), 'кнопки обкладинки');
});
