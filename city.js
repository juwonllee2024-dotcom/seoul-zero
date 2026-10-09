(function (root) {
  'use strict';
  function cityArt() {
    let seed = 701;
    const rand = () => { seed = (seed * 16807) % 2147483647; return seed / 2147483647; };
    const riverY = x => 355 + 45 * Math.sin((x - 200) / 190);
    let roads = '', blocks = '', towers = '', lights = '';
    for (let i = -600; i < 1500; i += 65) {
      roads += `<path d="M${i} 0l1000 650M${i} 650L${i+1000} 0"/>`;
    }
    const buildings = [];
    for (let y = 140; y < 625; y += 30) {
      for (let x = 55; x < 970; x += 30) {
        const xx = x + rand() * 18, yy = y + rand() * 15;
        if (Math.abs(yy - riverY(xx)) < 51 || rand() < .23) continue;
        const density = (xx > 480 && yy > 400) || (xx > 400 && xx < 670 && yy < 340);
        buildings.push({ x: xx, y: yy, h: 10 + rand() * (density ? 95 : 48), w: 7 + rand() * 11, d: 5 + rand() * 8, bright: rand() });
      }
    }
    buildings.sort((a,b) => a.y - b.y);
    for (const b of buildings) {
      const {x,y,h,w,d,bright} = b;
      const color = bright > .94 ? '#668552' : bright > .83 ? '#345a50' : '#263b34';
      blocks += `<g><path d="M${x-w} ${y-h}l${w} ${-d} ${w} ${d} ${-w} ${d}Z" fill="${color}" stroke="#56775f" stroke-opacity=".3" stroke-width=".7"/><path d="M${x-w} ${y-h}l${w} ${d}v${h}l${-w} ${-d}Z" fill="#1b2a25"/><path d="M${x} ${y-h+d}l${w} ${-d}v${h}l${-w} ${d}Z" fill="#31483b"/></g>`;
      if (bright > .73) {
        for (let k = 5; k < h; k += 9) lights += `<path d="M${x+3} ${y-h+d+k}l${w-5} ${-d*.55}" stroke="${bright > .94 ? '#d4fb78' : '#72b7a1'}" stroke-width="1.4" opacity="${.25 + rand() * .55}"/>`;
      }
    }
    // N Seoul Tower and the Seoul skyline are drawn locally; no downloaded artwork.
    towers = `<g transform="translate(532 265)"><ellipse cy="27" rx="46" ry="21" fill="#1d3028"/><path d="M-18 19L0-16 26 23" fill="#304634"/><path d="M-3 10V-84h6v94" fill="#738775"/><path d="M-11-78h22l-3-11H-8Z" fill="#9ab084"/><path d="M0-89v-36" stroke="#d4fb78" stroke-width="2"/><circle cy="-126" r="3" fill="#d4fb78" filter="url(#glow)"/></g><g transform="translate(859 455)"><path d="M-15 10L-8-135 0-170 8-135 15 10 0 19Z" fill="#446451" stroke="#83ad75" stroke-width="1"/><path d="M0 17v-177M-7-131L-11 9M7-131L11 9" stroke="#a0d78f" stroke-opacity=".55"/></g>`;
    return `<svg class="city-art" viewBox="0 0 1000 650" aria-hidden="true"><defs><pattern id="dots" width="22" height="22" patternUnits="userSpaceOnUse"><circle cx="1" cy="1" r=".8" fill="#54735d" opacity=".22"/></pattern><radialGradient id="aura"><stop stop-color="#365537" stop-opacity=".5"/><stop offset="1" stop-color="#131b18" stop-opacity="0"/></radialGradient><linearGradient id="water" x2="1" y2="1"><stop stop-color="#244e48"/><stop offset=".5" stop-color="#294e45"/><stop offset="1" stop-color="#173a37"/></linearGradient><filter id="glow"><feGaussianBlur stdDeviation="3"/></filter></defs><rect width="1000" height="650" fill="#131b18"/><rect width="1000" height="650" fill="url(#dots)"/><ellipse cx="520" cy="340" rx="500" ry="320" fill="url(#aura)"/><g stroke="#5c7763" stroke-opacity=".12" stroke-width="1">${roads}</g><path d="M-50 300C150 285 200 365 370 393S680 350 800 323 980 340 1060 387" stroke="#598879" stroke-opacity=".23" stroke-width="67" fill="none"/><path d="M-50 300C150 285 200 365 370 393S680 350 800 323 980 340 1060 387" stroke="url(#water)" stroke-width="57" fill="none"/><path d="M-50 300C150 285 200 365 370 393S680 350 800 323 980 340 1060 387" stroke="#91d6bd" stroke-dasharray="4 14" stroke-opacity=".35" fill="none"/><g stroke="#75947a" stroke-width="5" opacity=".6"><path d="M280 330l35 93M436 360l24 62M608 335l31 60M758 299l31 57"/></g>${blocks}${lights}${towers}<g fill="#90aa9b" font-family="monospace" font-size="11" letter-spacing="6" opacity=".7"><text x="520" y="388" transform="rotate(-10 520 388)">H A N   R I V E R</text></g><path class="network-line" d="M240 253L520 227 430 357 740 312 630 507 840 442" stroke="#b4df7b" stroke-width="1.5" stroke-dasharray="5 7" opacity=".35" fill="none"/><g fill="#c6ed97" opacity=".7"><circle r="2" cx="310" cy="190"/><circle r="2" cx="693" cy="408"/><circle r="2" cx="142" cy="455"/></g></svg>`;
  }
  root.SeoulCity = cityArt;
})(globalThis);
