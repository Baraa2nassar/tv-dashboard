// Prayer times calculated on-device. Methods: ISNA (Fajr 15°, Isha 15°) and Umm al-Qura
// (Fajr 18.5°, Isha 90 min after Maghrib, 120 in Ramadan). Based on the PrayTimes.org
// algorithm. Written in plain ES5 so the older Tizen browser can run it.
var PrayerCalc = (function () {
  function rad(d) { return d * Math.PI / 180; }
  function deg(r) { return r * 180 / Math.PI; }
  function sin(d) { return Math.sin(rad(d)); }
  function cos(d) { return Math.cos(rad(d)); }
  function tan(d) { return Math.tan(rad(d)); }
  function asin(x) { return deg(Math.asin(x)); }
  function acos(x) { return deg(Math.acos(x)); }
  function atan2(y, x) { return deg(Math.atan2(y, x)); }
  function acot(x) { return deg(Math.atan(1 / x)); }
  function fix(a, b) { a = a - b * Math.floor(a / b); return a < 0 ? a + b : a; }

  function julian(y, m, d) {
    if (m <= 2) { y -= 1; m += 12; }
    var A = Math.floor(y / 100), B = 2 - A + Math.floor(A / 4);
    return Math.floor(365.25 * (y + 4716)) + Math.floor(30.6001 * (m + 1)) + d + B - 1524.5;
  }

  function sun(jd) {
    var D = jd - 2451545.0;
    var g = fix(357.529 + 0.98560028 * D, 360);
    var q = fix(280.459 + 0.98564736 * D, 360);
    var L = fix(q + 1.915 * sin(g) + 0.020 * sin(2 * g), 360);
    var e = 23.439 - 0.00000036 * D;
    var RA = atan2(cos(e) * sin(L), cos(L)) / 15;
    return { decl: asin(sin(e) * sin(L)), eqt: q / 15 - fix(RA, 24) };
  }

  var METHODS = {
    isna: { fajr: 15, isha: 15 },
    ummalqura: { fajr: 18.5, ishaMinutes: 90, ramadanIshaMinutes: 120 }
  };

  // Returns {fajr, sunrise, dhuhr, asr, maghrib, isha} as Date objects for `date`.
  // tz is the UTC offset in hours; null uses the device's offset for that day (handles DST).
  function times(date, lat, lng, tz, method, ramadan) {
    var m = METHODS[method] || METHODS.isna;
    if (tz === null || tz === undefined) {
      tz = -new Date(date.getFullYear(), date.getMonth(), date.getDate(), 12).getTimezoneOffset() / 60;
    }
    var jd = julian(date.getFullYear(), date.getMonth() + 1, date.getDate()) - lng / (15 * 24);
    function midDay(t) { return fix(12 - sun(jd + t).eqt, 24); }
    function angleTime(angle, t, ccw) {
      var decl = sun(jd + t).decl, noon = midDay(t);
      var T = acos((-sin(angle) - sin(decl) * sin(lat)) / (cos(decl) * cos(lat))) / 15;
      return noon + (ccw ? -T : T);
    }
    function asrTime(t) {
      var decl = sun(jd + t).decl;
      return angleTime(-acot(1 + tan(Math.abs(lat - decl))), t);
    }
    var h = {
      fajr: angleTime(m.fajr, 5 / 24, true),
      sunrise: angleTime(0.833, 6 / 24, true),
      dhuhr: midDay(12 / 24),
      asr: asrTime(13 / 24),
      maghrib: angleTime(0.833, 18 / 24)
    };
    h.isha = m.ishaMinutes
      ? h.maghrib + (ramadan ? m.ramadanIshaMinutes : m.ishaMinutes) / 60
      : angleTime(m.isha, 18 / 24);

    var out = {};
    for (var k in h) {
      var mins = Math.round((h[k] + tz - lng / 15) * 60);
      var d = new Date(date.getFullYear(), date.getMonth(), date.getDate(), 0, 0, 0);
      d.setMinutes(mins);
      out[k] = d;
    }
    return out;
  }

  return { times: times };
})();

if (typeof module !== 'undefined') module.exports = PrayerCalc;
