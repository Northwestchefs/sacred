document.addEventListener("DOMContentLoaded", function () {
  const banner = document.getElementById("cookie-banner");
  const acceptButton = document.getElementById("accept-cookies");
  const consent = localStorage.getItem("cookieConsent");

  if (consent === "accepted") {
    loadAnalytics();
    return;
  }

  if (banner) {
    banner.style.display = "block";
  }

  if (acceptButton) {
    acceptButton.addEventListener("click", function () {
      localStorage.setItem("cookieConsent", "accepted");
      if (banner) {
        banner.style.display = "none";
      }
      loadAnalytics();
    });
  }
});

function loadAnalytics() {
  if (window.gtag || document.querySelector('script[src*="googletagmanager.com/gtag/js?id=G-S98WZ4FP80"]')) {
    return;
  }

  const script = document.createElement("script");
  script.async = true;
  script.src = "https://www.googletagmanager.com/gtag/js?id=G-S98WZ4FP80";
  document.head.appendChild(script);

  script.onload = function () {
    window.dataLayer = window.dataLayer || [];
    function gtag() {
      dataLayer.push(arguments);
    }
    window.gtag = gtag;

    gtag("js", new Date());
    gtag("config", "G-S98WZ4FP80");
  };
}
