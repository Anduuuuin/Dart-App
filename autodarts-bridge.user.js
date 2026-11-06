// ==UserScript==
// @name         DartClub – Autodarts-Brücke
// @namespace    dartclub
// @version      1.0
// @description  Leitet die Würfe vom lokalen Autodarts (Port 3180) an die DartClub-App weiter, falls der Browser die direkte Verbindung blockiert.
// @match        https://anduuuuin.github.io/Dart-App/*
// @grant        GM_xmlhttpRequest
// @grant        unsafeWindow
// @connect      127.0.0.1
// @connect      localhost
// @connect      *
// @run-at       document-start
// ==/UserScript==
(function () {
  unsafeWindow.__adBridge = function (url) {
    return new Promise(function (resolve, reject) {
      GM_xmlhttpRequest({
        method: 'GET', url: url, timeout: 2000,
        onload: function (r) { try { resolve(JSON.parse(r.responseText)); } catch (e) { reject(e); } },
        onerror: reject, ontimeout: reject
      });
    });
  };
})();
