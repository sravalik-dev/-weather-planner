import { useEffect, useMemo, useRef, useState } from "react";
import {
  getDestinations,
  addDestination,
  updateDestination,
  removeDestination,
  reorderDestinations,
  calculateDistance,
  calculateEta,
  getRouteSummary,
} from "../services/routeService";
import {
  addItineraryActivity,
  deleteItineraryActivity,
  generateItinerary as backendGenerateItinerary,
  getItinerary,
  getItinerarySummary,
  reorderItineraryActivities,
  toggleItineraryActivityLock,
  updateItineraryActivity,
} from "../services/itineraryService";
import { searchLocations } from "../utils/apiUtils";



const routePlannerStyles = `
  .route-planner-page.rp-page {
    --rp-ink: #142b3b;
    --rp-muted: #647887;
    --rp-line: #dce7e9;
    --rp-teal: #087e78;
    --rp-teal-dark: #075e5b;
    --rp-teal-soft: #e8f5f2;
    --rp-canvas: #f4f7f6;
    --rp-card: #ffffff;
    --rp-shadow: 0 12px 34px rgba(20, 43, 59, .07);
    min-height: 100vh;
    padding: 28px clamp(14px, 3vw, 42px) 54px;
    color: var(--rp-ink);
    background:
      radial-gradient(circle at 88% 4%, rgba(8,126,120,.09), transparent 25rem),
      linear-gradient(180deg, #f5f8f7 0%, #edf3f2 100%);
    font-family: Inter, ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
  }
  .rp-page *, .rp-page *::before, .rp-page *::after { box-sizing: border-box; }
  .rp-page button, .rp-page input, .rp-page select, .rp-page textarea { font: inherit; }
  .rp-shell { width: min(1380px, 100%); margin: 0 auto; }
  .rp-back {
    display: inline-flex; align-items: center; gap: 8px;
    border: 1px solid var(--rp-line); border-radius: 999px;
    padding: 9px 15px; margin-bottom: 18px; color: var(--rp-ink);
    background: rgba(255,255,255,.88); font-weight: 650; cursor: pointer;
    transition: transform .18s ease, box-shadow .18s ease, border-color .18s ease;
  }
  .rp-back:hover { transform: translateY(-1px); border-color: #9bcac4; box-shadow: 0 6px 18px rgba(20,43,59,.08); }
  .rp-hero {
    position: relative; overflow: hidden; display: grid;
    grid-template-columns: minmax(0, 1.25fr) minmax(280px, .9fr);
    gap: 26px; align-items: center; padding: clamp(24px, 4vw, 42px);
    border-radius: 26px; color: white;
    background: linear-gradient(120deg, #123d51 0%, #075e61 58%, #087e78 100%);
    box-shadow: 0 18px 44px rgba(7,94,91,.18);
  }
  .rp-hero::after {
    content: ""; position: absolute; width: 340px; height: 340px; right: 20%;
    top: -245px; border: 1px solid rgba(255,255,255,.16); border-radius: 50%;
    box-shadow: 0 0 0 34px rgba(255,255,255,.035), 0 0 0 70px rgba(255,255,255,.025);
    pointer-events: none;
  }
  .rp-hero-text, .rp-trip-facts { position: relative; z-index: 1; }
  .rp-eyebrow { display: inline-block; margin-bottom: 10px; color: #9fe4d9; font-size: 11px; font-weight: 800; letter-spacing: .16em; text-transform: uppercase; }
  .rp-hero h1 { margin: 0; font-size: clamp(30px, 4vw, 46px); line-height: 1.08; letter-spacing: -.04em; color: #fff; }
  .rp-hero p { max-width: 610px; margin: 13px 0 0; color: rgba(255,255,255,.82); font-size: 14px; line-height: 1.7; }
  .rp-trip-facts {
    display: grid; grid-template-columns: repeat(2, minmax(0,1fr)); gap: 10px;
    margin: 0; padding: 0;
  }
  .rp-trip-facts > div { min-width: 0; padding: 13px 15px; border: 1px solid rgba(255,255,255,.16); border-radius: 15px; background: rgba(255,255,255,.09); backdrop-filter: blur(8px); }
  .rp-trip-facts dt { margin-bottom: 5px; color: #a8ded8; font-size: 10px; font-weight: 800; letter-spacing: .12em; text-transform: uppercase; }
  .rp-trip-facts dd { overflow-wrap: anywhere; margin: 0; color: #fff; font-size: 14px; font-weight: 700; }
  .rp-metrics { display: grid; grid-template-columns: repeat(4, minmax(0,1fr)); gap: 13px; margin: 18px 0 22px; }
  .rp-metric {
    display: flex; align-items: center; gap: 14px; min-width: 0; padding: 17px 18px;
    border: 1px solid var(--rp-line); border-radius: 18px; background: var(--rp-card);
    box-shadow: 0 5px 18px rgba(20,43,59,.035);
  }
  .rp-metric-icon { display: grid; place-items: center; flex: 0 0 42px; width: 42px; height: 42px; border-radius: 13px; background: var(--rp-teal-soft); font-size: 19px; }
  .rp-metric strong { display: block; color: var(--rp-ink); font-size: 22px; line-height: 1.2; font-weight: 800; letter-spacing: -.03em; }
  .rp-metric div > span { display: block; margin-top: 4px; color: var(--rp-muted); font-size: 11px; font-weight: 650; }
  .rp-workspace { display: grid; grid-template-columns: minmax(0, 1.5fr) minmax(300px, .85fr); gap: 18px; align-items: start; }
  .rp-card, .destination-information-card, .route-insight-card, .module6-itinerary-card {
    min-width: 0; border: 1px solid var(--rp-line); border-radius: 22px;
    background: var(--rp-card); box-shadow: var(--rp-shadow);
  }
  .rp-card { padding: 22px; }
  .rp-card-head { display: flex; align-items: flex-start; justify-content: space-between; gap: 14px; margin-bottom: 18px; }
  .rp-card-head h2 { margin: 0; color: var(--rp-ink); font-size: 19px; letter-spacing: -.025em; }
  .rp-card-head p { margin: 6px 0 0; color: var(--rp-muted); font-size: 12px; line-height: 1.55; }
  .rp-badge { flex: 0 0 auto; padding: 7px 11px; border-radius: 999px; color: var(--rp-teal-dark); background: var(--rp-teal-soft); font-size: 11px; font-weight: 800; }
  .rp-add-form { display: flex; gap: 9px; margin-bottom: 15px; }
  .rp-add-form input, .rp-page input:not([type="checkbox"]), .rp-page select, .rp-page textarea {
    width: 100%; min-width: 0; border: 1px solid #d5e1e3; border-radius: 11px;
    padding: 11px 13px; color: var(--rp-ink); background: #fbfdfd; outline: none;
    transition: border-color .16s ease, box-shadow .16s ease, background .16s ease;
  }
  .rp-page input:focus, .rp-page select:focus, .rp-page textarea:focus { border-color: #55aaa1; background: #fff; box-shadow: 0 0 0 3px rgba(8,126,120,.12); }
  .rp-add-form button, .rp-stop-actions button, .rp-retry {
    border: 0; border-radius: 10px; padding: 10px 14px; color: #fff;
    background: var(--rp-teal); font-size: 12px; font-weight: 750; cursor: pointer;
    transition: transform .16s ease, background .16s ease, box-shadow .16s ease;
  }
  .rp-add-form button:hover, .rp-stop-actions button:hover, .rp-retry:hover { transform: translateY(-1px); background: var(--rp-teal-dark); box-shadow: 0 5px 12px rgba(8,126,120,.18); }
  .rp-page button:disabled { cursor: not-allowed; opacity: .48; transform: none; box-shadow: none; }
  .rp-sr-only { position: absolute; width: 1px; height: 1px; padding: 0; margin: -1px; overflow: hidden; clip: rect(0,0,0,0); white-space: nowrap; border: 0; }
  .rp-timeline { position: relative; display: grid; gap: 0; margin: 0; padding: 0; list-style: none; }
  .rp-stop-wrap { position: relative; border-radius: 15px; transition: background .15s ease, transform .15s ease; }
  .rp-stop-wrap.is-drop-target { background: #e9f6f3; outline: 2px dashed #55aaa1; }
  .rp-stop-wrap.is-dragging { opacity: .5; }
  .rp-stop { display: flex; align-items: center; gap: 12px; padding: 13px 10px; border: 1px solid transparent; border-radius: 15px; }
  .rp-stop:hover { border-color: #e0eceb; background: #fbfdfd; }
  .rp-handle { color: #8aa1a8; cursor: grab; font-size: 20px; user-select: none; }
  .rp-stop-number { display: grid; place-items: center; flex: 0 0 34px; width: 34px; height: 34px; border-radius: 50%; color: #fff; background: linear-gradient(145deg, #0c8980, #075e61); font-size: 13px; font-weight: 800; box-shadow: 0 4px 10px rgba(8,126,120,.18); }
  .rp-stop-body { display: grid; flex: 1; min-width: 0; gap: 4px; }
  .rp-stop-body strong { overflow-wrap: anywhere; color: var(--rp-ink); font-size: 14px; }
  .rp-stop-body > span { color: var(--rp-muted); font-size: 11px; }
  .rp-stop-actions { display: flex; align-items: center; flex-wrap: wrap; gap: 5px; }
  .rp-stop-actions button { padding: 7px 9px; font-size: 11px; }
  .rp-stop-actions .rp-icon-danger, .rp-stop-actions .rp-danger { background: #fff0ee; color: #b33e35; }
  .rp-stop-actions .rp-icon-danger:hover, .rp-stop-actions .rp-danger:hover { background: #b33e35; color: white; }
  .rp-confirm { color: #8b423c; font-size: 11px; font-weight: 700; }
  .rp-leg { position: relative; display: flex; align-items: center; min-height: 27px; padding-left: 57px; }
  .rp-leg-line { position: absolute; top: -3px; bottom: -3px; left: 26px; width: 2px; background: #c6dfda; }
  .rp-leg-chip { position: relative; z-index: 1; padding: 5px 10px; border: 1px solid #dcece8; border-radius: 999px; color: #28746e; background: #f0f8f6; font-size: 10px; font-weight: 700; }
  .rp-leg-muted { color: var(--rp-muted); background: #f6f8f8; }
  .rp-overview { position: sticky; top: 18px; }
  .rp-source { display: grid; gap: 5px; padding: 13px 14px; border-radius: 13px; background: #edf7f5; }
  .rp-source strong { color: var(--rp-teal-dark); font-size: 12px; }
  .rp-source span { color: var(--rp-muted); font-size: 11px; line-height: 1.55; }
  .rp-source.is-estimate { background: #fff7e9; }
  .rp-source.is-estimate strong { color: #94621b; }
  .rp-totals { display: grid; grid-template-columns: repeat(2,minmax(0,1fr)); gap: 9px; margin: 13px 0; }
  .rp-totals > div { padding: 13px; border: 1px solid var(--rp-line); border-radius: 13px; background: #fbfdfd; }
  .rp-totals span { display: block; color: var(--rp-muted); font-size: 10px; font-weight: 700; }
  .rp-totals strong { display: block; margin-top: 5px; color: var(--rp-ink); font-size: 18px; }
  .rp-legs { display: grid; gap: 14px; margin: 16px 0 0; padding: 0; list-style: none; }
  .rp-leg-row { display: flex; justify-content: space-between; align-items: center; gap: 10px; font-size: 11px; }
  .rp-leg-names { min-width: 0; color: var(--rp-ink); font-weight: 650; }
  .rp-leg-names b { display: inline-grid; place-items: center; width: 22px; height: 22px; margin-right: 5px; border-radius: 50%; color: var(--rp-teal-dark); background: var(--rp-teal-soft); }
  .rp-leg-values { flex: 0 0 auto; color: var(--rp-teal-dark); font-weight: 750; }
  .rp-leg-bar { height: 5px; overflow: hidden; margin: 8px 0 0 28px; border-radius: 99px; background: #edf2f2; }
  .rp-leg-bar i { display: block; height: 100%; border-radius: inherit; background: linear-gradient(90deg,#7ac6bb,#087e78); }
  .rp-empty, .rp-empty-small { padding: 30px 18px; text-align: center; border: 1px dashed #cbdcdd; border-radius: 15px; background: #fbfdfd; }
  .rp-empty > span, .rp-empty-small > span { display: block; margin-bottom: 8px; font-size: 28px; }
  .rp-empty h3 { margin: 0 0 6px; font-size: 15px; }
  .rp-empty p, .rp-empty-small p { max-width: 420px; margin: 0 auto; color: var(--rp-muted); font-size: 12px; line-height: 1.6; }
  .rp-empty-small { padding: 24px 14px; }
  .rp-alert, .rp-inline-error { display: flex; align-items: center; justify-content: space-between; gap: 12px; padding: 11px 14px; border-radius: 12px; font-size: 12px; }
  .rp-alert-error, .rp-inline-error { border: 1px solid #f1c4bd; color: #963e36; background: #fff1ef; }
  .rp-alert button { border: 0; color: inherit; background: transparent; font-size: 19px; cursor: pointer; }
  .rp-inline-error { margin: 10px 0; }
  .rp-skeleton-list { display: grid; gap: 10px; }
  .rp-skeleton-list > i { display: block; height: 62px; border-radius: 13px; background: linear-gradient(90deg,#eef3f3,#f8fbfb,#eef3f3); background-size: 200% 100%; animation: rp-shimmer 1.5s infinite; }
  .rp-skel { display: inline-block; width: 56px; height: 13px; border-radius: 99px; background: #e4eeee; vertical-align: middle; }
  @keyframes rp-shimmer { to { background-position: -200% 0; } }
  .destination-information-card, .route-insight-card, .module6-itinerary-card { margin-top: 20px; padding: clamp(18px, 2.5vw, 28px); }
  .destination-information-header { display: flex; justify-content: space-between; align-items: center; gap: 12px; margin-bottom: 17px; }
  .destination-information-header > div > span, .route-insight-card > span { color: var(--rp-teal); font-size: 10px; font-weight: 850; letter-spacing: .16em; }
  .destination-information-header h2, .route-insight-card h2 { margin: 7px 0; color: var(--rp-ink); font-size: 21px; letter-spacing: -.03em; }
  .destination-information-header p { margin: 0; color: var(--rp-muted); font-size: 12px; }
  .destination-table-wrapper { overflow-x: auto; border: 1px solid var(--rp-line); border-radius: 14px; }
  .destination-table { width: 100%; min-width: 920px; border-collapse: collapse; font-size: 11px; }
  .destination-table th { padding: 12px 10px; color: #55717d; background: #f2f7f6; text-align: left; font-size: 9px; letter-spacing: .08em; white-space: nowrap; }
  .destination-table td { padding: 12px 10px; border-top: 1px solid #edf1f1; color: #425d69; vertical-align: middle; }
  .destination-table tbody tr:hover { background: #f9fcfb; }
  .destination-table td strong { display: block; color: var(--rp-ink); font-size: 11px; }
  .destination-table td small { display: block; margin-top: 4px; color: #84969d; font-size: 9px; }
  .destination-order-pill { display: inline-grid; place-items: center; width: 25px; height: 25px; border-radius: 50%; color: var(--rp-teal-dark); background: var(--rp-teal-soft); font-weight: 800; }
  .destination-information-empty { padding: 24px; border: 1px dashed #cbdcdd; border-radius: 14px; color: var(--rp-muted); background: #fbfdfd; text-align: center; font-size: 12px; }
  .route-insight-card { overflow: hidden; background: linear-gradient(135deg,#f7fbfa,#edf7f5); }
  .route-sequence { display: flex; flex-wrap: wrap; align-items: center; gap: 10px; margin-top: 16px; }
  .route-sequence-item { display: flex; align-items: center; gap: 8px; padding: 9px 12px; border: 1px solid #d7e8e4; border-radius: 999px; background: #fff; }
  .route-sequence-item > span { display: grid; place-items: center; width: 23px; height: 23px; border-radius: 50%; color: #fff; background: var(--rp-teal); font-size: 10px; font-weight: 800; }
  .route-sequence-item strong { color: var(--rp-ink); font-size: 11px; }
  .route-sequence-item b { margin-left: 3px; color: #8aa7a4; }
  .module6-itinerary-card { overflow: hidden; }
  .module6-header { display: flex; justify-content: space-between; align-items: center; gap: 18px; padding: 22px; border-radius: 17px; color: white; background: linear-gradient(115deg,#123d51,#075e61 68%,#087e78); }
  .module6-header-main { display: flex; align-items: center; gap: 14px; min-width: 0; }
  .module6-icon { display: grid; place-items: center; flex: 0 0 48px; width: 48px; height: 48px; border: 1px solid rgba(255,255,255,.2); border-radius: 15px; background: rgba(255,255,255,.13); font-size: 23px; }
  .module6-eyebrow { color: #a9e4dc; font-size: 9px; font-weight: 850; letter-spacing: .16em; }
  .module6-header h2 { margin: 4px 0 5px; color: #fff; font-size: clamp(18px,2vw,23px); letter-spacing: -.03em; }
  .module6-header p { margin: 0; color: rgba(255,255,255,.78); font-size: 11px; line-height: 1.5; }
  .module6-header-actions { display: flex; flex-wrap: wrap; justify-content: flex-end; gap: 8px; }
  .module6-header-actions button, .module6-day-add, .module6-empty-day button, .module6-modal-actions button {
    border: 1px solid transparent; border-radius: 10px; padding: 10px 13px; font-size: 11px; font-weight: 750; cursor: pointer; transition: .16s ease;
  }
  .module6-secondary-button { color: var(--rp-teal-dark); background: #fff; }
  .module6-primary-button { color: #fff; background: #2679ed; }
  .module6-save-button { color: #fff; border-color: rgba(255,255,255,.22) !important; background: rgba(255,255,255,.12); }
  .module6-header-actions button:hover, .module6-day-add:hover, .module6-empty-day button:hover { transform: translateY(-1px); filter: brightness(.96); }
  .module6-info-strip { display: grid; grid-template-columns: repeat(3,minmax(90px,.65fr)) minmax(180px,1.4fr); gap: 9px; margin: 14px 0; }
  .module6-info-strip > div { padding: 12px 14px; border: 1px solid var(--rp-line); border-radius: 13px; background: #f7faf9; }
  .module6-info-strip span { display: block; color: #68818a; font-size: 9px; font-weight: 850; letter-spacing: .1em; }
  .module6-info-strip strong { display: block; margin-top: 5px; color: var(--rp-ink); font-size: 19px; }
  .module6-info-strip .module6-info-note p { margin: 6px 0 0; color: var(--rp-muted); font-size: 10px; line-height: 1.5; }
  .module6-alert { display: flex; justify-content: space-between; align-items: center; gap: 12px; margin: 10px 0; padding: 11px 13px; border-radius: 11px; font-size: 11px; }
  .module6-success { color: #176b50; border: 1px solid #bfe4d3; background: #effaf4; }
  .module6-error { color: #9a4039; border: 1px solid #f0c5bf; background: #fff2f0; }
  .module6-alert button { border: 0; color: inherit; background: transparent; font-size: 18px; cursor: pointer; }
  .module6-loading { padding: 35px; color: var(--rp-muted); text-align: center; font-size: 12px; }
  .module6-days { display: grid; gap: 13px; margin-top: 15px; }
  .module6-day-card { overflow: hidden; border: 1px solid #dce7e7; border-radius: 15px; background: #fff; transition: border-color .16s ease, box-shadow .16s ease; }
  .module6-day-card:focus-within, .module6-day-card:hover { border-color: #b7d8d2; box-shadow: 0 6px 18px rgba(20,43,59,.045); }
  .module6-day-header { display: flex; justify-content: space-between; align-items: center; gap: 12px; padding: 12px 15px; border-bottom: 1px solid #dceae7; background: linear-gradient(90deg,#edf7f4,#f6faf9); }
  .module6-day-header > div { display: flex; align-items: center; gap: 12px; }
  .module6-day-header span { color: var(--rp-teal); font-size: 9px; font-weight: 850; letter-spacing: .12em; }
  .module6-day-header h3 { margin: 0; color: var(--rp-ink); font-size: 14px; }
  .module6-day-add { border-color: #b9d2d1; color: var(--rp-teal-dark); background: #fff; }
  .module6-empty-day { display: flex; flex-wrap: wrap; align-items: center; gap: 8px 12px; margin: 10px; padding: 15px; border: 1px dashed #c7d9d9; border-radius: 12px; background: #fbfdfd; }
  .module6-empty-day strong { color: var(--rp-ink); font-size: 11px; }
  .module6-empty-day p { flex: 1; margin: 0; color: var(--rp-muted); font-size: 10px; }
  .module6-empty-day button { border-color: #c7d9d9; color: var(--rp-teal-dark); background: #fff; }
  .module6-activity-list { display: grid; gap: 9px; padding: 10px; }
  .module6-activity { display: grid; grid-template-columns: 78px minmax(0,1fr); gap: 14px; padding: 13px; border: 1px solid #dce7e9; border-radius: 13px; background: #fff; transition: box-shadow .16s ease, transform .16s ease, border-color .16s ease; }
  .module6-activity:hover { border-color: #b9d9d3; box-shadow: 0 5px 16px rgba(20,43,59,.06); }
  .module6-activity[draggable="true"] { cursor: grab; }
  .module6-activity-locked { border-color: #e5d8b8; background: #fffdf8; }
  .module6-time-column { display: flex; flex-direction: column; align-items: flex-end; gap: 5px; padding-right: 13px; border-right: 2px solid #d5e6e4; }
  .module6-time-column strong { color: var(--rp-ink); font-size: 13px; font-variant-numeric: tabular-nums; }
  .module6-time-column span { color: var(--rp-muted); font-size: 10px; }
  .module6-activity-body { min-width: 0; }
  .module6-activity-top { display: flex; justify-content: space-between; gap: 12px; }
  .module6-activity-title-row { display: flex; align-items: center; gap: 8px; }
  .module6-activity-title-row h4 { margin: 0; color: var(--rp-ink); font-size: 13px; }
  .module6-lock-badge { padding: 3px 6px; border-radius: 99px; color: #8a641c; background: #fff1cc; font-size: 9px; }
  .module6-location { display: inline-block; margin-top: 6px; color: var(--rp-muted); font-size: 10px; }
  .module6-activity-notes { margin: 8px 0 0; color: #637983; font-size: 10px; line-height: 1.5; }
  .module6-activity-actions { display: flex; flex-wrap: wrap; gap: 5px; margin-top: 9px; }
  .module6-activity-actions button { border: 1px solid #cbdcde; border-radius: 8px; padding: 5px 9px; color: #315b6a; background: #f7faf9; font-size: 10px; font-weight: 700; cursor: pointer; }
  .module6-activity-actions button:hover { border-color: #8fc3ba; color: var(--rp-teal-dark); background: #edf8f5; }
  .module6-drag-handle { color: #9aadb2; }
  .module6-footer { margin-top: 13px; padding: 11px 13px; border: 1px solid var(--rp-line); border-radius: 11px; color: var(--rp-muted); background: #f7faf9; font-size: 10px; text-align: center; }
  .module6-modal-overlay { position: fixed; z-index: 1000; inset: 0; display: grid; place-items: center; overflow-y: auto; padding: 18px; background: rgba(10,29,39,.58); backdrop-filter: blur(5px); }
  .module6-modal { width: min(540px,100%); max-height: min(90vh,800px); overflow-y: auto; padding: 22px; border: 1px solid rgba(255,255,255,.5); border-radius: 20px; background: #fff; box-shadow: 0 25px 80px rgba(0,0,0,.25); }
  .module6-modal-header { display: flex; justify-content: space-between; align-items: flex-start; gap: 15px; padding-bottom: 15px; border-bottom: 1px solid var(--rp-line); }
  .module6-modal-header h2 { margin: 5px 0 0; color: var(--rp-ink); font-size: 22px; }
  .module6-modal-close { display: grid; place-items: center; width: 34px; height: 34px; border: 1px solid var(--rp-line); border-radius: 50%; color: var(--rp-ink); background: #f8fbfa; font-size: 20px; cursor: pointer; }
  .module6-form { display: grid; gap: 13px; padding-top: 16px; }
  .module6-form label, .destination-information-card form label { display: grid; gap: 6px; color: #405c68; font-size: 11px; font-weight: 700; }
  .module6-form label > span { color: #405c68; }
  .module6-form-grid { display: grid; grid-template-columns: repeat(2,minmax(0,1fr)); gap: 12px; }
  .module6-form textarea { resize: vertical; }
  .module6-modal-actions { display: flex; justify-content: flex-end; gap: 9px; padding-top: 6px; }
  .module6-cancel-button { border-color: var(--rp-line) !important; color: var(--rp-ink); background: #fff; }
  .module6-modal-actions .module6-primary-button { color: #fff; background: var(--rp-teal); }
  .route-empty-trip { max-width: 620px; margin: 12vh auto; padding: 42px; border: 1px solid var(--rp-line); border-radius: 22px; background: #fff; box-shadow: var(--rp-shadow); text-align: center; }
  .route-empty-trip h2 { color: var(--rp-ink); }
  .route-empty-trip p { color: var(--rp-muted); }
  .route-planner-footer { margin-top: 18px; color: var(--rp-muted); font-size: 10px; text-align: center; }
  @media (max-width: 980px) {
    .rp-hero { grid-template-columns: 1fr; }
    .rp-workspace { grid-template-columns: 1fr; }
    .rp-overview { position: static; }
    .module6-header { align-items: flex-start; flex-direction: column; }
    .module6-header-actions { justify-content: flex-start; }
  }
  @media (max-width: 680px) {
    .route-planner-page.rp-page { padding: 15px 11px 35px; }
    .rp-hero { padding: 23px 19px; border-radius: 19px; }
    .rp-trip-facts { grid-template-columns: repeat(2,minmax(0,1fr)); }
    .rp-metrics { grid-template-columns: repeat(2,minmax(0,1fr)); gap: 8px; margin: 12px 0; }
    .rp-metric { gap: 9px; padding: 12px 10px; border-radius: 13px; }
    .rp-metric-icon { flex-basis: 34px; width: 34px; height: 34px; font-size: 16px; }
    .rp-metric strong { font-size: 17px; }
    .rp-metric div > span { font-size: 9px; }
    .rp-card { padding: 15px; }
    .rp-add-form { flex-direction: column; }
    .rp-stop { flex-wrap: wrap; padding: 11px 7px; }
    .rp-stop-body { flex-basis: calc(100% - 105px); }
    .rp-stop-actions { width: 100%; padding-left: 46px; }
    .rp-leg { padding-left: 48px; }
    .rp-leg-line { left: 22px; }
    .module6-itinerary-card, .destination-information-card, .route-insight-card { padding: 13px; border-radius: 17px; }
    .module6-header { padding: 17px; }
    .module6-header-main { align-items: flex-start; }
    .module6-header-actions { width: 100%; }
    .module6-header-actions button { flex: 1 1 auto; }
    .module6-info-strip { grid-template-columns: repeat(3,minmax(0,1fr)); }
    .module6-info-strip .module6-info-note { grid-column: 1 / -1; }
    .module6-activity { grid-template-columns: 62px minmax(0,1fr); gap: 10px; padding: 10px; }
    .module6-time-column { padding-right: 9px; }
    .module6-activity-top { flex-direction: column; }
    .module6-empty-day { align-items: flex-start; flex-direction: column; }
    .module6-form-grid { grid-template-columns: 1fr; }
    .module6-modal { padding: 17px; }
    .route-sequence { align-items: flex-start; flex-direction: column; }
    .route-sequence-item { width: 100%; justify-content: flex-start; }
  }
  /* ---- 24-hour itinerary: activity types, summary, options ---- */
  .module6-options { display: flex; flex-wrap: wrap; align-items: center; gap: 8px 18px; margin: 12px 0 0; padding: 10px 13px; border: 1px dashed var(--rp-line); border-radius: 12px; background: #fbfdfc; font-size: 11px; color: var(--rp-ink); }
  .module6-options label { display: inline-flex; align-items: center; gap: 7px; cursor: pointer; font-weight: 650; }
  .module6-options input { accent-color: var(--rp-teal); }
  .module6-mode-pill { margin-left: auto; padding: 3px 10px; border-radius: 999px; background: var(--rp-teal-soft); color: var(--rp-teal-dark); font-size: 10px; font-weight: 800; letter-spacing: .04em; }
  .module6-summary { margin: 12px 0; padding: 14px; border: 1px solid #cfe3df; border-radius: 14px; background: linear-gradient(180deg, #f4faf8, #ffffff); }
  .module6-summary-title { display: flex; justify-content: space-between; align-items: center; gap: 10px; margin: 0 0 10px; font-size: 11px; font-weight: 850; letter-spacing: .08em; color: #3f6670; }
  .module6-summary-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(120px, 1fr)); gap: 8px; }
  .module6-summary-grid > div { padding: 9px 11px; border: 1px solid var(--rp-line); border-radius: 11px; background: #fff; }
  .module6-summary-grid span { display: block; color: #68818a; font-size: 9px; font-weight: 850; letter-spacing: .09em; }
  .module6-summary-grid strong { display: block; margin-top: 4px; font-size: 15px; color: var(--rp-ink); }
  .module6-summary-days { display: flex; flex-wrap: wrap; gap: 6px; margin-top: 10px; }
  .module6-summary-days span { padding: 4px 9px; border-radius: 999px; background: #eef5f4; color: #3a5560; font-size: 10px; font-variant-numeric: tabular-nums; }
  .module6-summary-warnings { margin: 10px 0 0; padding: 9px 12px 9px 28px; border-radius: 10px; background: #fff8e8; border: 1px solid #f0dfb2; color: #7a5a13; font-size: 10px; line-height: 1.55; }
  .module6-type-badge { display: inline-flex; align-items: center; gap: 4px; padding: 2px 8px; border-radius: 999px; font-size: 9px; font-weight: 800; letter-spacing: .03em; background: #eef2f3; color: #46606b; white-space: nowrap; }
  .module6-type-TRAVEL { background: #e6f0fb; color: #1f5a99; }
  .module6-type-RETURN { background: #efe8fb; color: #5a3a99; }
  .module6-type-VISIT { background: #e5f6ee; color: #136b47; }
  .module6-type-MEAL { background: #fff1e0; color: #9a5a0b; }
  .module6-type-REST { background: #f3efe6; color: #6e5a2e; }
  .module6-type-FREE_TIME { background: #eef6e6; color: #4d6e1d; }
  .module6-type-ACCOMMODATION { background: #e8eafb; color: #3b45a0; }
  .module6-activity[data-type="TRAVEL"] { border-left: 3px solid #5b9bd5; }
  .module6-activity[data-type="RETURN"] { border-left: 3px solid #8c6bd1; }
  .module6-activity[data-type="VISIT"] { border-left: 3px solid #2fa36b; }
  .module6-activity[data-type="MEAL"] { border-left: 3px solid #e8a04a; }
  .module6-activity[data-type="ACCOMMODATION"] { border-left: 3px solid #6671d6; }
  .module6-meta-row { display: flex; flex-wrap: wrap; gap: 6px; margin-top: 6px; }
  .module6-meta-chip { padding: 2px 8px; border-radius: 8px; background: #f2f6f6; color: #4a636d; font-size: 10px; font-variant-numeric: tabular-nums; }
  .module6-meta-chip.module6-estimate { background: #fff4d6; color: #8a5f00; font-weight: 700; }
  .module6-time-column .module6-time-end { color: var(--rp-ink); font-size: 11px; font-variant-numeric: tabular-nums; }
  .module6-time-column .module6-next-day { color: #b0541a; font-size: 9px; font-weight: 800; }
  @media (prefers-reduced-motion: reduce) {
    .rp-page *, .rp-page *::before, .rp-page *::after { animation-duration: .01ms !important; transition-duration: .01ms !important; }
  }
`;

// Always normalize activity times before placing them in a time input or API payload.
// Accepts HH:mm, HH:mm:ss, and ISO date-time strings; rejects invalid values.
const toInputTime = (value, fallback = "09:00") => {
  if (value === null || value === undefined) return fallback;

  const raw = String(value).trim();
  if (!raw || /nan|null|undefined/i.test(raw)) return fallback;

  const timePart = raw.includes("T") ? raw.split("T").pop() : raw;
  const match = /^(?:([01]\d|2[0-3]):([0-5]\d)(?::[0-5]\d(?:\.\d+)?)?)/.exec(timePart);

  if (!match) return fallback;
  return `${match[1]}:${match[2]}`;
};

const getTripId = (trip) =>
  trip?.tripId ?? trip?.id ?? trip?.tripID ?? null;

const dateStringToUtcDay = (value) => {
  const match = /^(\d{4})-(\d{2})-(\d{2})/.exec(String(value || ""));
  if (!match) return null;
  return Math.floor(
    Date.UTC(Number(match[1]), Number(match[2]) - 1, Number(match[3])) / 86400000
  );
};

// Whole calendar days between two YYYY-MM-DD strings (b - a).
const daysBetweenDates = (a, b) => {
  const first = dateStringToUtcDay(a);
  const second = dateStringToUtcDay(b);
  if (first === null || second === null) return null;
  return second - first;
};

// The itinerary is scheduled by the backend over startDate..endDate, so the
// number of day cards must come from those dates first. noOfDays is only a
// fallback; if the two ever disagree, activities on later days would be hidden.
const getTripDays = (trip) => {
  const span = daysBetweenDates(trip?.startDate, trip?.endDate);
  if (span !== null && span >= 0 && span < 366) return span + 1;

  const values = [
    trip?.numberOfDays,
    trip?.noOfDays,
    trip?.days,
    trip?.durationDays,
    trip?.duration,
  ];

  const value = values.find(
    (item) =>
      Number.isFinite(Number(item)) &&
      Number(item) > 0
  );

  return Math.max(1, Number(value) || 1);
};

const createEmptyItinerary = (days) =>
  Array.from({ length: days }, (_, index) => ({
    day: index + 1,
    activities: [],
  }));

const createActivityId = () =>
  `activity_${Date.now()}_${Math.random()
    .toString(36)
    .slice(2, 9)}`;

// Activity types the backend can produce. Older rows have no type, so it is
// inferred from the category.
const ACTIVITY_TYPE_META = {
  TRAVEL: { label: "Travel", icon: "🚗" },
  RETURN: { label: "Return journey", icon: "🏠" },
  VISIT: { label: "Destination visit", icon: "📍" },
  MEAL: { label: "Meal break", icon: "🍽️" },
  REST: { label: "Rest break", icon: "☕" },
  FREE_TIME: { label: "Free time", icon: "🌴" },
  ACCOMMODATION: { label: "Overnight stay", icon: "🛏️" },
  CUSTOM: { label: "Custom", icon: "✏️" },
};

const resolveActivityType = (activity) => {
  const explicit = String(activity?.activityType || "").trim().toUpperCase();
  if (ACTIVITY_TYPE_META[explicit]) return explicit;

  const category = String(activity?.category || "").trim().toUpperCase();
  if (category === "TRAVEL") return "TRAVEL";
  if (category === "MEAL") return "MEAL";
  if (category === "BREAK") return "REST";
  if (category === "ACCOMMODATION") return "ACCOMMODATION";
  if (activity?.destinationId) return "VISIT";
  return "CUSTOM";
};

const formatMinutesLong = (value) => {
  // Number(null) is 0, which would show a missing value as "0 min".
  if (value === null || value === undefined || value === "") return "--";
  const minutes = Math.round(Number(value));
  if (!Number.isFinite(minutes) || minutes < 0) return "--";
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  if (h === 0) return `${m} min`;
  return m === 0 ? `${h} h` : `${h} h ${m} min`;
};

const formatShortDate = (dateString) => {
  const day = dateStringToUtcDay(dateString);
  if (day === null) return String(dateString || "");
  return new Date(day * 86400000).toLocaleDateString("en-GB", {
    day: "2-digit",
    month: "short",
    timeZone: "UTC",
  });
};

const normalizeActivity = (activity, day) => {
  const activityDate = String(activity?.activityDate || "").slice(0, 10);
  const endDate = String(
    activity?.endDate || activity?.activityDate || ""
  ).slice(0, 10);
  const dayOffset = Math.max(0, daysBetweenDates(activityDate, endDate) || 0);

  return {
    id: activity?.activityId ?? activity?.id ?? null,
    day,
    activityDate: activity?.activityDate || "",
    endDate: activity?.endDate || activity?.activityDate || "",
    time: toInputTime(activity?.startTime, "09:00"),
    endTime: toInputTime(activity?.endTime, ""),
    endDayOffset: dayOffset,
    crossesMidnight: dayOffset > 0,
    title: activity?.activityName || "Untitled Activity",
    location: activity?.destinationName || "",
    duration: activity?.duration || "60",
    notes: activity?.description || "",
    category: activity?.category || "",
    activityType: resolveActivityType(activity),
    distanceKm:
      activity?.distanceKm === null || activity?.distanceKm === undefined
        ? null
        : Number(activity.distanceKm),
    estimated: Boolean(activity?.estimated),
    routeSource: activity?.routeSource || "",
    generated: Boolean(activity?.generated),
    destinationId: activity?.destinationId ?? null,
    locked: Boolean(activity?.locked),
  };
};

// Keep trip dates as calendar strings. Avoid toISOString() on local-midnight
// dates because it can move the date backwards in UTC+05:30.
const addDaysToDateString = (dateString, days = 0) => {
  if (!dateString) return "";

  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(
    String(dateString).slice(0, 10)
  );
  if (!match) return "";

  const [, year, month, day] = match;
  const date = new Date(
    Date.UTC(
      Number(year),
      Number(month) - 1,
      Number(day) + Number(days)
    )
  );

  if (Number.isNaN(date.getTime())) return "";

  return [
    date.getUTCFullYear(),
    String(date.getUTCMonth() + 1).padStart(2, "0"),
    String(date.getUTCDate()).padStart(2, "0"),
  ].join("-");
};

const normalizeItinerary = (value, days, startDate) => {
  const source = Array.isArray(value) ? value : [];

  return Array.from({ length: days }, (_, index) => {
    const dayNumber = index + 1;
    const dateKey = addDaysToDateString(startDate, index);
    const existingActivities = source
      .filter((item) => String(item?.activityDate || "").slice(0, 10) === dateKey)
      .sort((a, b) => Number(a.orderIndex || 0) - Number(b.orderIndex || 0));

    return {
      day: dayNumber,
      activities: existingActivities.map((activity) =>
        normalizeActivity(activity, dayNumber)
      ),
    };
  });
};

const getActivityDate = (trip, day) =>
  addDaysToDateString(trip?.startDate, Math.max(1, Number(day) || 1) - 1);

const formatDistance = (value) => {
  if (
    value === null ||
    value === undefined ||
    value === ""
  ) {
    return "--";
  }

  if (typeof value === "object") {
    const numeric =
      value?.distance ??
      value?.totalDistance ??
      value?.value ??
      value?.km;

    if (
      numeric !== undefined &&
      numeric !== null
    ) {
      return formatDistance(numeric);
    }

    return "--";
  }

  const numeric = Number(value);

  if (Number.isNaN(numeric)) {
    return String(value);
  }

  if (numeric < 1) {
    return `${Math.round(numeric * 1000)} m`;
  }

  return `${numeric.toFixed(1)} km`;
};

const formatDuration = (value) => {
  if (
    value === null ||
    value === undefined ||
    value === ""
  ) {
    return "--";
  }

  if (typeof value === "object") {
    const duration =
      value?.duration ??
      value?.totalDuration ??
      value?.eta ??
      value?.minutes ??
      value?.value;

    if (
      duration !== undefined &&
      duration !== null
    ) {
      return formatDuration(duration);
    }

    return "--";
  }

  if (
    typeof value === "string" &&
    value.includes(":")
  ) {
    return value;
  }

  const minutes = Number(value);

  if (Number.isNaN(minutes)) {
    return String(value);
  }

  const hours = Math.floor(minutes / 60);
  const remaining = Math.round(minutes % 60);

  if (hours === 0) {
    return `${remaining} min`;
  }

  if (remaining === 0) {
    return `${hours} hr`;
  }

  return `${hours} hr ${remaining} min`;
};

const timeToMinutes = (time) => {
  if (!time || !String(time).includes(":")) {
    return 0;
  }

  const [hours, minutes] = String(time)
    .split(":")
    .map(Number);

  return hours * 60 + minutes;
};

const getDestinationName = (destination) =>
  destination?.name ||
  destination?.destinationName ||
  destination?.locationName ||
  destination?.city ||
  destination?.placeName ||
  "Destination";

const getDestinationId = (destination) =>
  destination?.destinationId ??
  destination?.id ??
  destination?.destinationID;

const getDestinationField = (
  destination,
  ...fields
) => {
  for (const field of fields) {
    const value = destination?.[field];

    if (
      value !== undefined &&
      value !== null &&
      value !== ""
    ) {
      return value;
    }
  }

  return "--";
};

const displayValue = (value) => {
  if (
    value === null ||
    value === undefined ||
    value === ""
  ) {
    return "--";
  }

  if (typeof value === "boolean") {
    return value ? "Yes" : "No";
  }

  if (typeof value === "object") {
    return "--";
  }

  return String(value);
};

function RoutePlanner({ trip, onBack }) {
  const tripId = getTripId(trip);
  const tripDays = getTripDays(trip);

  const [destinations, setDestinations] =
    useState([]);

  const [loading, setLoading] =
    useState(true);

  const [listError, setListError] =
    useState("");

  const [destinationInput, setDestinationInput] =
    useState("");

  const [geocoding, setGeocoding] =
    useState(false);

  const [adding, setAdding] =
    useState(false);

  const [addError, setAddError] =
    useState("");

  // MODULE 5: edit destination information
  const [editingDestinationId, setEditingDestinationId] =
    useState(null);

  const [destinationEditForm, setDestinationEditForm] =
    useState({
      category: "",
      bestTime: "",
      openingTime: "",
      closingTime: "",
      ticketPrice: "",
      expectedDuration: "",
      popularity: "",
      indoorOutdoor: "",
      familyFriendly: false,
      wheelchairFriendly: false,
      kidsFriendly: false,
    });

  const [destinationEditSaving, setDestinationEditSaving] =
    useState(false);

  const [destinationEditError, setDestinationEditError] =
    useState("");

  const [removingId, setRemovingId] =
    useState(null);

  const [reorderingId, setReorderingId] =
    useState(null);

  // One summary object from the backend: totals + every leg.
  const [routeSummary, setRouteSummary] =
    useState(null);

  const [routeReloadKey, setRouteReloadKey] =
    useState(0);

  // Drag and drop / confirm-before-remove
  const [dragIndex, setDragIndex] =
    useState(null);

  const [dragOverIndex, setDragOverIndex] =
    useState(null);

  const [confirmRemoveId, setConfirmRemoveId] =
    useState(null);

  const [routeSummaryLoading, setRouteSummaryLoading] =
    useState(false);

  const [routeSummaryError, setRouteSummaryError] =
    useState("");

  // =====================================================
  // MODULE 6
  // =====================================================

  const [itinerary, setItinerary] =
    useState(() =>
      createEmptyItinerary(tripDays)
    );

  const [itineraryLoading, setItineraryLoading] =
    useState(true);

  const [itineraryGenerating, setItineraryGenerating] =
    useState(false);

  const [itinerarySaving, setItinerarySaving] =
    useState(false);

  const [itineraryMessage, setItineraryMessage] =
    useState("");

  const [itineraryError, setItineraryError] =
    useState("");

  // Round trip is the default. One-way ends at the last destination.
  const [roundTrip, setRoundTrip] =
    useState(true);

  const [optimizeRoute, setOptimizeRoute] =
    useState(false);

  // Totals and warnings for the saved itinerary (GET .../itinerary/summary).
  const [itinerarySummary, setItinerarySummary] =
    useState(null);

  // Synchronous guard: React state updates are asynchronous, so two quick
  // clicks could both pass a state-based "is generating" check.
  const generateInFlight = useRef(false);

  const [activityModalOpen, setActivityModalOpen] =
    useState(false);

  const [editingActivity, setEditingActivity] =
    useState(null);

  const [activityForm, setActivityForm] =
    useState({
      day: 1,
      time: "09:00",
      title: "",
      location: "",
      duration: "60",
      notes: "",
    });

  const [draggedActivity, setDraggedActivity] =
    useState(null);

  const [dragOverTarget, setDragOverTarget] =
    useState(null);

  // =====================================================
  // LOAD DESTINATIONS
  // =====================================================

  useEffect(() => {
    let cancelled = false;

    const loadDestinations = async () => {
      if (!tripId) {
        setDestinations([]);
        setLoading(false);
        return;
      }

      setLoading(true);
      setListError("");

      try {
        const response =
          await getDestinations(tripId);

        if (cancelled) return;

        const list = Array.isArray(response)
          ? response
          : Array.isArray(response?.destinations)
          ? response.destinations
          : Array.isArray(response?.data)
          ? response.data
          : [];

        const sorted = [...list].sort(
          (a, b) =>
            Number(
              a.destinationOrder ??
                a.order ??
                0
            ) -
            Number(
              b.destinationOrder ??
                b.order ??
                0
            )
        );

        setDestinations(sorted);
      } catch (error) {
        if (!cancelled) {
          setListError(
            error?.message ||
              "Unable to load destinations."
          );
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    };

    loadDestinations();

    return () => {
      cancelled = true;
    };
  }, [tripId]);

  // =====================================================
  // ROUTE SUMMARY
  // =====================================================

  // Recalculate only when the ORDER or COORDINATES of the stops change
  // (not when unrelated details such as ticket price are edited).
  const routeKey = destinations
    .map(
      (item) =>
        `${getDestinationId(item)}:${item?.latitude},${item?.longitude}`
    )
    .join("|");

  useEffect(() => {
    let cancelled = false;

    const loadRouteSummary = async () => {
      if (!tripId || destinations.length < 2) {
        setRouteSummary(null);
        setRouteSummaryLoading(false);
        setRouteSummaryError("");
        return;
      }

      setRouteSummaryLoading(true);
      setRouteSummaryError("");

      try {
        let summary;

        try {
          summary = await getRouteSummary(tripId);
        } catch (error) {
          // Older backend without /route/summary: use the two original
          // endpoints. The page then shows totals but no per-leg details.
          if (error?.status !== 404 && error?.status !== 405) {
            throw error;
          }

          const [distanceResponse, etaResponse] =
            await Promise.all([
              calculateDistance(tripId),
              calculateEta(tripId),
            ]);

          const hours = Number(
            etaResponse?.estimatedTravelTimeHours
          );

          summary = {
            totalDistanceKm:
              distanceResponse?.totalDistanceKm ?? null,
            totalDurationMinutes: Number.isFinite(hours)
              ? hours * 60
              : null,
            averageSpeedKmph:
              etaResponse?.averageSpeedKmph ?? null,
            approximate: false,
            source: "OSRM",
            legs: [],
          };
        }

        if (!cancelled) {
          setRouteSummary(summary);
        }
      } catch (error) {
        if (!cancelled) {
          setRouteSummary(null);

          setRouteSummaryError(
            error?.message ||
              "Unable to calculate route distance and estimated time."
          );
        }
      } finally {
        if (!cancelled) {
          setRouteSummaryLoading(false);
        }
      }
    };

    loadRouteSummary();

    return () => {
      cancelled = true;
    };
  }, [tripId, routeKey, routeReloadKey]);

  // =====================================================
  // LOAD ITINERARY
  // =====================================================

  useEffect(() => {
    let cancelled = false;

    if (!tripId) {
      setItinerary(createEmptyItinerary(tripDays));
      setItineraryLoading(false);
      return;
    }

    const loadItinerary = async () => {
      setItineraryLoading(true);
      setItineraryError("");

      try {
        const activities = await getItinerary(tripId);
        if (!cancelled) {
          setItinerary(
            normalizeItinerary(
              activities,
              tripDays,
              trip?.startDate
            )
          );
        }
      } catch (error) {
        if (!cancelled) {
          setItineraryError(
            error?.message || "Unable to load itinerary."
          );
          setItinerary(createEmptyItinerary(tripDays));
        }
      } finally {
        if (!cancelled) setItineraryLoading(false);
      }
    };

    loadItinerary();

    return () => {
      cancelled = true;
    };
  }, [tripId, tripDays]);

  // Keep the totals in step with whatever is saved (generate, add, move, delete...).
  useEffect(() => {
    if (!tripId || itineraryLoading) return undefined;

    let cancelled = false;

    getItinerarySummary(tripId)
      .then((summary) => {
        if (!cancelled) setItinerarySummary(summary);
      })
      .catch(() => {
        if (!cancelled) setItinerarySummary(null);
      });

    return () => {
      cancelled = true;
    };
  }, [tripId, itinerary, itineraryLoading]);

  // =====================================================
  // GEOCODING
  // Search through the backend so landmark searches use
  // Nominatim first, with Open-Meteo as a city-search fallback.
  // =====================================================

  const geocodeLocation = async (location) => {
    const results = await searchLocations(location);

    if (!Array.isArray(results) || results.length === 0) {
      throw new Error(
        `Could not find "${location}". Try another spelling or a nearby city.`
      );
    }

    const result = results[0];
    const latitude = Number(result?.latitude);
    const longitude = Number(result?.longitude);

    if (
      !Number.isFinite(latitude) ||
      !Number.isFinite(longitude) ||
      latitude < -90 ||
      latitude > 90 ||
      longitude < -180 ||
      longitude > 180
    ) {
      throw new Error("The location search returned invalid coordinates.");
    }

    return {
      ...result,
      name:
        result?.name ||
        result?.city ||
        result?.displayName ||
        location,
      latitude,
      longitude,
    };
  };

  // =====================================================
  // ADD DESTINATION
  // =====================================================

  const handleAddDestination = async (
    event
  ) => {
    event?.preventDefault();

    const location =
      destinationInput.trim();

    if (!location) {
      setAddError(
        "Please enter a destination."
      );
      return;
    }

    if (!tripId) {
      setAddError(
        "No trip is currently selected."
      );
      return;
    }

    setAdding(true);
    setGeocoding(true);
    setAddError("");

    try {
      const result =
        await geocodeLocation(location);

      await addDestination(
        tripId,
        {
          destinationName: result.name || result.displayName || location,
          latitude: result.latitude,
          longitude: result.longitude,
        }
      );

      const refreshed =
        await getDestinations(tripId);

      const list =
        Array.isArray(refreshed)
          ? refreshed
          : Array.isArray(
              refreshed?.destinations
            )
          ? refreshed.destinations
          : Array.isArray(
              refreshed?.data
            )
          ? refreshed.data
          : [];

      setDestinations(
        [...list].sort(
          (a, b) =>
            Number(
              a.destinationOrder ??
                a.order ??
                0
            ) -
            Number(
              b.destinationOrder ??
                b.order ??
                0
            )
        )
      );

      setDestinationInput("");
    } catch (error) {
      setAddError(
        error?.message ||
          "Unable to add this destination."
      );
    } finally {
      setGeocoding(false);
      setAdding(false);
    }
  };

  // =====================================================
  // MODULE 5: EDIT DESTINATION INFORMATION
  // =====================================================

  const handleEditDestination = (destination) => {
    const destinationId = getDestinationId(destination);

    if (destinationId === null || destinationId === undefined || destinationId === "") {
      setListError("Cannot edit this destination because its ID is missing.");
      return;
    }

    setListError("");
    setDestinationEditError("");
    setEditingDestinationId(destinationId);
    setDestinationEditForm({
      category: destination?.category ?? "",
      bestTime: destination?.bestTime ?? destination?.best_time ?? "",
      openingTime: String(destination?.openingTime ?? destination?.opening_time ?? "").slice(0, 5),
      closingTime: String(destination?.closingTime ?? destination?.closing_time ?? "").slice(0, 5),
      ticketPrice: destination?.ticketPrice ?? destination?.ticket_price ?? "",
      expectedDuration: destination?.expectedDuration ?? destination?.expected_duration ?? "",
      popularity: destination?.popularity ?? "",
      indoorOutdoor: destination?.indoorOutdoor ?? destination?.indoor_outdoor ?? "",
      familyFriendly: Boolean(destination?.familyFriendly ?? destination?.family_friendly),
      wheelchairFriendly: Boolean(destination?.wheelchairFriendly ?? destination?.wheelchair_friendly),
      kidsFriendly: Boolean(destination?.kidsFriendly ?? destination?.kids_friendly),
    });
  };

  const handleDestinationEditChange = (event) => {
    const { name, value, type, checked } = event.target;
    setDestinationEditForm((current) => ({
      ...current,
      [name]: type === "checkbox" ? checked : value,
    }));
  };

  const handleCancelDestinationEdit = () => {
    setEditingDestinationId(null);
    setDestinationEditError("");
  };

  const handleSaveDestinationEdit = async (event) => {
    event.preventDefault();

    if (!tripId || editingDestinationId === null || editingDestinationId === undefined) {
      setDestinationEditError("Trip or destination ID is missing.");
      return;
    }

    const selectedDestination = destinations.find(
      (item) => String(getDestinationId(item)) === String(editingDestinationId)
    );

    if (!selectedDestination) {
      setDestinationEditError("The selected destination could not be found. Refresh the destination list and try again.");
      return;
    }

    const ticketPrice = destinationEditForm.ticketPrice === ""
      ? null
      : Number(destinationEditForm.ticketPrice);
    const expectedDuration = destinationEditForm.expectedDuration === ""
      ? null
      : Number(destinationEditForm.expectedDuration);
    const popularity = destinationEditForm.popularity === ""
      ? null
      : Number(destinationEditForm.popularity);

    if (ticketPrice !== null && (!Number.isFinite(ticketPrice) || ticketPrice < 0)) {
      setDestinationEditError("Ticket price must be zero or greater.");
      return;
    }

    if (expectedDuration !== null && (!Number.isInteger(expectedDuration) || expectedDuration <= 0)) {
      setDestinationEditError("Expected duration must be a whole number greater than zero (minutes).");
      return;
    }

    if (popularity !== null && (!Number.isFinite(popularity) || popularity < 0 || popularity > 5)) {
      setDestinationEditError("Popularity must be between 0 and 5.");
      return;
    }

    if (destinationEditForm.openingTime && destinationEditForm.closingTime && destinationEditForm.openingTime >= destinationEditForm.closingTime) {
      setDestinationEditError("Opening time must be earlier than closing time.");
      return;
    }

    const request = {
      // The backend update service validates these Module 4 fields too.
      destinationName: getDestinationName(selectedDestination),
      latitude: Number(selectedDestination.latitude),
      longitude: Number(selectedDestination.longitude),
      category: destinationEditForm.category.trim() || null,
      bestTime: destinationEditForm.bestTime.trim() || null,
      openingTime: destinationEditForm.openingTime || null,
      closingTime: destinationEditForm.closingTime || null,
      ticketPrice,
      expectedDuration,
      popularity,
      indoorOutdoor: destinationEditForm.indoorOutdoor || null,
      familyFriendly: destinationEditForm.familyFriendly,
      wheelchairFriendly: destinationEditForm.wheelchairFriendly,
      kidsFriendly: destinationEditForm.kidsFriendly,
    };

    if (!Number.isFinite(request.latitude) || !Number.isFinite(request.longitude)) {
      setDestinationEditError("This destination is missing valid coordinates. Please remove and add it again before editing.");
      return;
    }

    setDestinationEditSaving(true);
    setDestinationEditError("");

    try {
      await updateDestination(tripId, editingDestinationId, request);

      const refreshed = await getDestinations(tripId);
      const list = Array.isArray(refreshed)
        ? refreshed
        : Array.isArray(refreshed?.destinations)
        ? refreshed.destinations
        : Array.isArray(refreshed?.data)
        ? refreshed.data
        : [];

      setDestinations(
        [...list].sort(
          (a, b) =>
            Number(a.destinationOrder ?? a.order ?? 0) -
            Number(b.destinationOrder ?? b.order ?? 0)
        )
      );
      setEditingDestinationId(null);
    } catch (error) {
      setDestinationEditError(
        error?.message || "Unable to update destination information."
      );
    } finally {
      setDestinationEditSaving(false);
    }
  };

  // =====================================================
  // REMOVE DESTINATION
  // =====================================================

  const handleRemoveDestination =
    async (destination) => {
      const destinationId =
        getDestinationId(destination);

      if (!tripId || !destinationId) {
        return;
      }

      setRemovingId(destinationId);

      try {
        await removeDestination(
          tripId,
          destinationId
        );

        setDestinations(
          (current) =>
            current.filter(
              (item) =>
                getDestinationId(
                  item
                ) !== destinationId
            )
        );
      } catch (error) {
        setListError(
          error?.message ||
            "Unable to remove destination."
        );
      } finally {
        setRemovingId(null);
      }
    };

  // =====================================================
  // REORDER DESTINATIONS
  // =====================================================

  const reorderTo = async (fromIndex, toIndex) => {
    if (
      !tripId ||
      fromIndex === toIndex ||
      fromIndex < 0 ||
      toIndex < 0 ||
      fromIndex >= destinations.length ||
      toIndex >= destinations.length
    ) {
      return;
    }

    const previous = destinations;
    const current = [...destinations];

    const [moved] = current.splice(fromIndex, 1);
    current.splice(toIndex, 0, moved);

    // Show the new order immediately...
    setDestinations(current);

    const destinationIds = current
      .map(getDestinationId)
      .filter(Boolean);

    setReorderingId(getDestinationId(moved));

    try {
      await reorderDestinations(tripId, destinationIds);
    } catch (error) {
      // ...but put the old order back if the server refused, so the
      // screen never disagrees with what is saved.
      setDestinations(previous);

      setListError(
        error?.message ||
          "Unable to save destination order."
      );
    } finally {
      setReorderingId(null);
    }
  };

  // =====================================================
  // ITINERARY HELPERS
  // =====================================================

  const destinationNames =
    destinations
      .map(getDestinationName)
      .filter(Boolean);

  const getTripDestinationNames =
    () => {
      if (destinationNames.length) {
        return destinationNames;
      }

      const fallback =
        trip?.destination ||
        trip?.destinationName ||
        trip?.location ||
        trip?.place ||
        trip?.city;

      return fallback
        ? [fallback]
        : ["Your destination"];
    };

  const updateItinerary = (
    updater
  ) => {
    setItinerary((current) =>
      updater(current)
    );

    setItineraryMessage("");
    setItineraryError("");
  };

  // =====================================================
  // GENERATE ITINERARY
  // =====================================================

  const generateItinerary = async () => {
    if (!tripId) {
      setItineraryError("No trip is selected.");
      return;
    }

    // Ignore a second click/request while one is already running.
    if (generateInFlight.current) return;
    generateInFlight.current = true;

    setItineraryGenerating(true);
    setItineraryError("");
    setItineraryMessage("");

    try {
      const activities = await backendGenerateItinerary(tripId, {
        roundTrip,
        optimizeRoute,
      });
      setItinerary(
        normalizeItinerary(
          activities,
          tripDays,
          trip?.startDate
        )
      );
      setItineraryMessage(
        roundTrip
          ? "Round-trip itinerary generated: road travel times, meal and rest breaks, and a return journey to the starting point."
          : "One-way itinerary generated: road travel times and meal and rest breaks, ending at the last destination."
      );
    } catch (error) {
      // Backend messages are specific (for example "cannot fit ... extend the
      // trip by 2 days"), so show them as they are.
      setItineraryError(
        error?.message || "Unable to generate itinerary."
      );
    } finally {
      generateInFlight.current = false;
      setItineraryGenerating(false);
    }
  };

  // =====================================================
  // SAVE
  // =====================================================

  const saveItinerary = async () => {
    if (!tripId) {
      setItineraryError("No trip is selected.");
      return;
    }

    setItinerarySaving(true);
    setItineraryError("");

    try {
      const activities = await getItinerary(tripId);
      setItinerary(
        normalizeItinerary(
          activities,
          tripDays,
          trip?.startDate
        )
      );
      setItineraryMessage("Itinerary refreshed from the backend.");
    } catch (error) {
      setItineraryError(
        error?.message || "Unable to save itinerary."
      );
    } finally {
      setItinerarySaving(false);
    }
  };

  // =====================================================
  // ACTIVITY MODAL
  // =====================================================

  const openAddActivityModal = (
    day = 1
  ) => {
    setEditingActivity(null);

    setActivityForm({
      day,
      time: "09:00",
      title: "",
      location:
        getTripDestinationNames()[
          day - 1
        ] || "",
      duration: "60",
      notes: "",
    });

    setActivityModalOpen(true);
  };

  const openEditActivityModal =
    (activity, day) => {
      if (activity.locked) {
        setItineraryError(
          "Unlock this activity before editing it."
        );
        return;
      }

      setEditingActivity({
        id: activity.id,
        day,
      });

      setActivityForm({
        day,
        time: toInputTime(activity.time, "09:00"),
        title:
          activity.title ||
          "",
        location:
          activity.location ||
          "",
        duration:
          activity.duration ||
          "60",
        notes:
          activity.notes ||
          "",
      });

      setActivityModalOpen(true);
    };

  const closeActivityModal =
    () => {
      setActivityModalOpen(false);
      setEditingActivity(null);
    };

  const handleActivityFormChange =
    (event) => {
      const {
        name,
        value,
      } = event.target;

      setActivityForm(
        (current) => ({
          ...current,
          [name]: value,
        })
      );
    };

  const handleActivitySubmit = async (event) => {
    event.preventDefault();

    if (!activityForm.title.trim()) {
      setItineraryError("Activity title is required.");
      return;
    }

    if (!tripId) {
      setItineraryError("No trip is selected.");
      return;
    }

    const selectedDay = Math.min(
      tripDays,
      Math.max(1, Number(activityForm.day) || 1)
    );

    // Validate and normalize the HTML time input before building the request.
    const startTime = toInputTime(activityForm.time, "");
    if (!startTime) {
      setItineraryError("Please select a valid activity start time.");
      return;
    }

    const duration = Number(activityForm.duration);
    if (!Number.isFinite(duration) || !Number.isInteger(duration) || duration < 1 || duration > 1440) {
      setItineraryError("Activity duration must be a whole number between 1 and 1440 minutes.");
      return;
    }

    // Calculate end time using integer minutes. This avoids Invalid Date and NaN:NaN.
    // An activity may cross midnight: the end time wraps and endDate moves forward.
    const [startHours, startMinutesPart] = startTime.split(":").map(Number);
    const totalStartMinutes = startHours * 60 + startMinutesPart;
    const totalEndMinutes = totalStartMinutes + duration;
    const endDayOffset = Math.floor(totalEndMinutes / (24 * 60));
    const endOfDayMinutes = totalEndMinutes % (24 * 60);
    const endHours = Math.floor(endOfDayMinutes / 60);
    const endMinutes = endOfDayMinutes % 60;
    const endTimeValue =
      `${String(endHours).padStart(2, "0")}:` +
      `${String(endMinutes).padStart(2, "0")}`;

    const activityDate = getActivityDate(trip, selectedDay);
    if (!activityDate) {
      setItineraryError(
        "This trip is missing a valid start date. Refresh your trips and try again."
      );
      return;
    }

    const endDate = addDaysToDateString(activityDate, endDayOffset);
    const lastTripDate = getActivityDate(trip, tripDays);
    if (
      endDayOffset > 0 &&
      lastTripDate &&
      daysBetweenDates(lastTripDate, endDate) > 0
    ) {
      setItineraryError(
        `This activity would end on ${endDate}, after the last trip day (${lastTripDate}). Choose an earlier start time or a shorter duration.`
      );
      return;
    }

    const request = {
      destinationId: null,
      activityDate,
      startTime,
      endDate,
      endTime: endTimeValue,
      activityName: activityForm.title.trim(),
      description: activityForm.notes.trim(),
      category: "Custom",
      duration,
      locked: false,
    };

    // Keep this log while testing; both LocalTime values must be HH:mm.
    console.log("ITINERARY ACTIVITY REQUEST:", request);

    try {
      if (editingActivity) {
        const existing = itinerary
          .find((day) => day.day === editingActivity.day)
          ?.activities.find((activity) => activity.id === editingActivity.id);

        if (!existing) throw new Error("Activity not found. Refresh the itinerary and try again.");
        if (existing.locked) throw new Error("Unlock this activity before editing it.");
        if (existing.id === null || existing.id === undefined || existing.id === "") {
          throw new Error("This activity has no saved database ID. Refresh the itinerary before editing it.");
        }

        request.destinationId = existing.destinationId ?? null;
        request.category = existing.category || "Custom";
        const updated = await updateItineraryActivity(tripId, existing.id, request);
        const updatedId = updated?.activityId ?? updated?.id ?? existing.id;
        if (updatedId === null || updatedId === undefined || updatedId === "") {
          throw new Error("The server did not return the updated activity ID. Refresh the itinerary.");
        }
        const refreshed = await getItinerary(tripId);
        setItinerary(normalizeItinerary(refreshed, tripDays, trip?.startDate));
      } else {
        const saved = await addItineraryActivity(tripId, request);
        const savedId = saved?.activityId ?? saved?.id ?? null;
        if (savedId === null || savedId === undefined || savedId === "") {
          throw new Error(
            "The server did not return the saved activity ID. The activity may have been saved; refresh the itinerary before trying again."
          );
        }
        setItinerary((current) =>
          current.map((day) =>
            day.day === selectedDay
              ? {
                  ...day,
                  activities: [
                    ...day.activities,
                    normalizeActivity(saved, selectedDay),
                  ],
                }
              : day
          )
        );
      }

      setItineraryMessage(
        editingActivity ? "Activity updated." : "Activity added."
      );
      closeActivityModal();
    } catch (error) {
      setItineraryError(
        error?.message || "Unable to save activity."
      );
    }
  };

  // =====================================================
  // ACTIVITY ACTIONS
  // =====================================================

  const removeActivity = async (dayNumber, activityId) => {
    const activity = itinerary
      .find((day) => day.day === dayNumber)
      ?.activities.find((item) => item.id === activityId);

    if (!activity) return;
    if (activityId === null || activityId === undefined || activityId === "") {
      setItineraryError("This activity has no saved ID. Refresh the itinerary before deleting it.");
      return;
    }
    if (activity.locked) {
      setItineraryError("Unlock this activity before removing it.");
      return;
    }

    try {
      await deleteItineraryActivity(tripId, activityId);
      setItinerary((current) =>
        current.map((day) =>
          day.day === dayNumber
            ? {
                ...day,
                activities: day.activities.filter(
                  (item) => item.id !== activityId
                ),
              }
            : day
        )
      );
      setItineraryMessage("Activity deleted.");
    } catch (error) {
      setItineraryError(
        error?.message || "Unable to delete activity."
      );
    }
  };

  const toggleActivityLock = async (dayNumber, activityId) => {
    const activity = itinerary
      .find((day) => day.day === dayNumber)
      ?.activities.find((item) => item.id === activityId);

    if (!activity) return;
    if (activityId === null || activityId === undefined || activityId === "") {
      setItineraryError("This activity has no saved ID. Refresh the itinerary before changing its lock.");
      return;
    }

    try {
      const nextLocked = !activity.locked;
      await toggleItineraryActivityLock(
        tripId,
        activityId,
        nextLocked
      );
      setItinerary((current) =>
        current.map((day) =>
          day.day === dayNumber
            ? {
                ...day,
                activities: day.activities.map((item) =>
                  item.id === activityId
                    ? { ...item, locked: nextLocked }
                    : item
                ),
              }
            : day
        )
      );
    } catch (error) {
      setItineraryError(
        error?.message || "Unable to change activity lock."
      );
    }
  };

  const moveActivity = async (dayNumber, index, direction) => {
    const day = itinerary.find((item) => item.day === dayNumber);
    if (!day) return;

    const target = index + direction;
    if (target < 0 || target >= day.activities.length) return;
    if (
      day.activities[index].locked ||
      day.activities[target].locked
    ) {
      setItineraryError(
        "Unlock the activities before rearranging them."
      );
      return;
    }

    if (day.activities.some((activity) =>
      activity.id === null || activity.id === undefined || activity.id === ""
    )) {
      setItineraryError("At least one activity is missing its saved ID. Refresh the itinerary before rearranging activities.");
      return;
    }

    const reordered = [...day.activities];
    const [moved] = reordered.splice(index, 1);
    reordered.splice(target, 0, moved);

    try {
      await reorderItineraryActivities(
        tripId,
        getActivityDate(trip, dayNumber),
        reordered.map((activity) => activity.id)
      );
      setItinerary((current) =>
        current.map((item) =>
          item.day === dayNumber
            ? { ...item, activities: reordered }
            : item
        )
      );
    } catch (error) {
      setItineraryError(
        error?.message || "Unable to reorder activities."
      );
    }
  };

  // =====================================================
  // DRAG & DROP
  // =====================================================

  const handleDragStart =
    (
      day,
      activityId
    ) => {
      const activity =
        itinerary
          .find(
            (item) =>
              item.day === day
          )
          ?.activities.find(
            (item) =>
              item.id ===
              activityId
          );

      if (
        !activity ||
        activity.id === null ||
        activity.id === undefined ||
        activity.id === "" ||
        activity.locked
      ) {
        return;
      }

      setDraggedActivity({
        day,
        id: activityId,
      });
    };

  const handleDragEnd =
    () => {
      setDraggedActivity(null);
      setDragOverTarget(null);
    };

  const handleDragOver =
    (
      event,
      day,
      id
    ) => {
      event.preventDefault();

      if (!draggedActivity) {
        return;
      }

      setDragOverTarget({
        day,
        id,
      });
    };

  const handleDrop = async (event, targetDay, targetId = null) => {
    event.preventDefault();
    if (!draggedActivity) return;

    const sourceDay = draggedActivity.day;
    const sourceId = draggedActivity.id;
    const source = itinerary.find((day) => day.day === sourceDay);
    const sourceActivity = source?.activities.find((activity) => activity.id === sourceId);

    if (!sourceActivity) {
      setItineraryError("The dragged activity could not be found. Refresh the itinerary.");
      handleDragEnd();
      return;
    }

    if (sourceDay !== targetDay) {
      if (sourceActivity.locked) {
        setItineraryError("Unlock this activity before moving it to another day.");
        handleDragEnd();
        return;
      }
      if (sourceActivity.id === null || sourceActivity.id === undefined || sourceActivity.id === "") {
        setItineraryError("This activity has no saved ID. Refresh the itinerary before moving it.");
        handleDragEnd();
        return;
      }
      const target = itinerary.find((day) => day.day === targetDay);
      const targetDate = getActivityDate(trip, targetDay);
      const duration = Math.max(1, Number(sourceActivity.duration) || 60);

      // Minutes counted from 00:00 of the target day. An activity that started the
      // night before can run past midnight into this day, so its end is measured
      // with its real end date instead of being ignored.
      const minutesFromTargetStart = (dateString, timeString) => {
        const [h, m] = timeString.split(":").map(Number);
        const offset = daysBetweenDates(targetDate, dateString) || 0;
        return offset * 24 * 60 + h * 60 + m;
      };
      const latestEnd = (target?.activities || []).reduce((latest, item) => {
        const end = toInputTime(item.endTime, "");
        if (!end) return latest;
        return Math.max(
          latest,
          minutesFromTargetStart(item.endDate || item.activityDate || targetDate, end)
        );
      }, 8 * 60);
      const startTotal = Math.max(9 * 60, latestEnd + 15);
      const endTotal = startTotal + duration;

      // The only hard limits are the trip dates: it must start on the target day and
      // end by 23:59 on the last trip day.
      const lastTripDate = getActivityDate(trip, tripDays);
      const lastAllowedMinute =
        ((daysBetweenDates(targetDate, lastTripDate) || 0) + 1) * 24 * 60 - 1;
      if (!targetDate || startTotal >= 24 * 60 || endTotal > lastAllowedMinute) {
        setItineraryError("There is not enough free time on that day within the trip dates. Choose another day or edit the activity time.");
        handleDragEnd();
        return;
      }
      const formatMinutes = (value) => {
        const inDay = value % (24 * 60);
        return `${String(Math.floor(inDay / 60)).padStart(2, "0")}:${String(inDay % 60).padStart(2, "0")}`;
      };
      const moveRequest = {
        destinationId: sourceActivity.destinationId ?? null,
        activityDate: targetDate,
        startTime: formatMinutes(startTotal),
        endDate: addDaysToDateString(targetDate, Math.floor(endTotal / (24 * 60))),
        endTime: formatMinutes(endTotal),
        activityName: sourceActivity.title,
        description: sourceActivity.notes || "",
        category: sourceActivity.category || "Custom",
        duration,
        locked: false,
      };
      try {
        await updateItineraryActivity(tripId, sourceActivity.id, moveRequest);
        const refreshed = await getItinerary(tripId);
        setItinerary(normalizeItinerary(refreshed, tripDays, trip?.startDate));
        setItineraryMessage(`Moved activity to Day ${targetDay}.`);
      } catch (error) {
        setItineraryError(error?.message || "Unable to move activity to the selected day.");
      } finally {
        handleDragEnd();
      }
      return;
    }

    const sourceIndex = source?.activities.findIndex((activity) => activity.id === sourceId);
    const targetIndex = targetId
      ? source?.activities.findIndex((activity) => activity.id === targetId)
      : source?.activities.length;
    if (sourceIndex === undefined || sourceIndex < 0 || targetIndex === undefined || targetIndex < 0
        || source.activities[sourceIndex].locked || source.activities[targetIndex]?.locked) {
      setItineraryError("Unlock the activities before rearranging them.");
      handleDragEnd();
      return;
    }
    if (source.activities.some((activity) => activity.id === null || activity.id === undefined || activity.id === "")) {
      setItineraryError("At least one activity is missing its saved ID. Refresh the itinerary before rearranging activities.");
      handleDragEnd();
      return;
    }

    const reordered = [...source.activities];
    const [moved] = reordered.splice(sourceIndex, 1);
    const adjustedTarget = reordered.findIndex((activity) => activity.id === targetId);
    reordered.splice(adjustedTarget >= 0 ? adjustedTarget : reordered.length, 0, moved);
    try {
      await reorderItineraryActivities(tripId, getActivityDate(trip, sourceDay), reordered.map((activity) => activity.id));
      setItinerary((current) => current.map((day) => day.day === sourceDay ? { ...day, activities: reordered } : day));
    } catch (error) {
      setItineraryError(error?.message || "Unable to reorder activities.");
    } finally {
      handleDragEnd();
    }
  };

  // =====================================================
  // STATS
  // =====================================================

  const itineraryStats =
    useMemo(() => {
      const activities =
        itinerary.flatMap(
          (day) =>
            day.activities
        );

      return {
        total:
          activities.length,
        locked:
          activities.filter(
            (item) =>
              item.locked
          ).length,
        days:
          itinerary.filter(
            (day) =>
              day.activities
                .length > 0
          ).length,
      };
    }, [itinerary]);

  const tripTitle =
    trip?.tripName ||
    trip?.name ||
    trip?.title ||
    "Your Trip";

  const routeLegs = routeSummary?.legs || [];

  const longestLegKm = Math.max(
    1,
    ...routeLegs.map((leg) => Number(leg.distanceKm) || 0)
  );

  const formatTripDate = (value) => {
    const date = new Date(`${value}T00:00:00`);
    return Number.isNaN(date.getTime())
      ? ""
      : date.toLocaleDateString("en-IN", {
          day: "numeric",
          month: "short",
          year: "numeric",
        });
  };

  const tripDateRange =
    trip?.startDate && trip?.endDate
      ? `${formatTripDate(trip.startDate)} – ${formatTripDate(trip.endDate)}`
      : "";

  const travelerCount =
    trip?.noOfTravelers ??
    trip?.travelers ??
    trip?.numberOfTravelers ??
    trip?.travellers ??
    "--";

  const budget =
    trip?.budget ??
    trip?.totalBudget ??
    trip?.estimatedBudget ??
    "--";

  const budgetText =
    budget === "--" || !Number.isFinite(Number(budget))
      ? "--"
      : `₹${Number(budget).toLocaleString("en-IN")}`;

  // =====================================================
  // EMPTY
  // =====================================================

  if (!trip) {
    return (
      <div className="route-planner-page rp-page">
        <style>{routePlannerStyles}</style>
        <div className="route-planner-shell rp-shell">
          <div className="route-empty-trip">
            <h2>No trip selected</h2>

            <p>
              Select a trip to open the
              Smart Route Planner.
            </p>

            <button
              type="button"
              onClick={onBack}
              className="route-back-button"
            >
              ← Back to My Trips
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="route-planner-page rp-page">
      <style>{routePlannerStyles}</style>
      <div className="route-planner-shell rp-shell">

        <button
          type="button"
          className="route-back-button rp-back"
          onClick={onBack}
        >
          ← Back to My Trips
        </button>

        {/* ===================== HERO ===================== */}

        <header className="rp-hero">
          <div className="rp-hero-text">
            <span className="rp-eyebrow">Smart travel workspace</span>
            <h1>Smart Route Planner</h1>
            <p>
              Arrange your stops, see the driving distance and time between
              each one, and keep everything in the order you will travel.
            </p>
          </div>

          <dl className="rp-trip-facts" aria-label="Selected trip">
            <div>
              <dt>Trip</dt>
              <dd>{tripTitle}</dd>
            </div>
            {tripDateRange && (
              <div>
                <dt>Dates</dt>
                <dd>{tripDateRange}</dd>
              </div>
            )}
            <div>
              <dt>Travelers</dt>
              <dd>{travelerCount}</dd>
            </div>
            <div>
              <dt>Budget</dt>
              <dd>{budgetText}</dd>
            </div>
          </dl>
        </header>

        {/* ===================== SUMMARY STRIP ===================== */}

        <section className="rp-metrics" aria-label="Route summary" aria-busy={routeSummaryLoading}>
          <div className="rp-metric">
            <span className="rp-metric-icon" aria-hidden="true">📍</span>
            <div>
              <strong>{destinations.length}</strong>
              <span>{destinations.length === 1 ? "Stop" : "Stops"}</span>
            </div>
          </div>
          <div className="rp-metric">
            <span className="rp-metric-icon" aria-hidden="true">🛣️</span>
            <div>
              <strong>
                {routeSummaryLoading ? <i className="rp-skel" /> : formatDistance(routeSummary?.totalDistanceKm)}
              </strong>
              <span>Total distance</span>
            </div>
          </div>
          <div className="rp-metric">
            <span className="rp-metric-icon" aria-hidden="true">⏱️</span>
            <div>
              <strong>
                {routeSummaryLoading ? <i className="rp-skel" /> : formatDuration(routeSummary?.totalDurationMinutes)}
              </strong>
              <span>Driving time</span>
            </div>
          </div>
          <div className="rp-metric">
            <span className="rp-metric-icon" aria-hidden="true">🚗</span>
            <div>
              <strong>
                {routeSummaryLoading
                  ? <i className="rp-skel" />
                  : routeSummary?.averageSpeedKmph
                    ? `${Math.round(routeSummary.averageSpeedKmph)} km/h`
                    : "--"}
              </strong>
              <span>Average speed</span>
            </div>
          </div>
        </section>

        {/* ===================== ALERTS ===================== */}

        {listError && (
          <div className="rp-alert rp-alert-error" role="alert">
            <span>{listError}</span>
            <button type="button" onClick={() => setListError("")} aria-label="Dismiss message">×</button>
          </div>
        )}

        {/* ===================== WORKSPACE ===================== */}

        <div className="rp-workspace">

          {/* ---------- LEFT: add stop + timeline ---------- */}

          <section className="rp-card rp-route-card" aria-labelledby="rp-route-title">
            <div className="rp-card-head">
              <div>
                <h2 id="rp-route-title">Your route</h2>
                <p>Drag a stop by its handle, or use the arrows, to change the order.</p>
              </div>
              <span className="rp-badge">{destinations.length} {destinations.length === 1 ? "stop" : "stops"}</span>
            </div>

            <form className="rp-add-form" onSubmit={handleAddDestination}>
              <label htmlFor="rp-add-input" className="rp-sr-only">Add a destination</label>
              <input
                id="rp-add-input"
                type="text"
                value={destinationInput}
                onChange={(event) => setDestinationInput(event.target.value)}
                placeholder="Search a city or place to add..."
                disabled={adding}
                autoComplete="off"
              />
              <button type="submit" disabled={adding || geocoding || !destinationInput.trim()}>
                {geocoding ? "Finding..." : adding ? "Adding..." : "+ Add stop"}
              </button>
            </form>

            {addError && <div className="rp-inline-error" role="alert">{addError}</div>}

            {loading ? (
              <div className="rp-skeleton-list" aria-busy="true" aria-label="Loading stops">
                <i /><i /><i />
              </div>
            ) : destinations.length === 0 ? (
              <div className="rp-empty">
                <span aria-hidden="true">🧭</span>
                <h3>No stops yet</h3>
                <p>Search for your first destination above. Add at least two stops to see distances and travel times.</p>
              </div>
            ) : (
              <ol className="rp-timeline">
                {destinations.map((destination, index) => {
                  const id = getDestinationId(destination);
                  const leg = routeLegs[index - 1]; // leg that arrives at this stop
                  const category = destination?.category;
                  const confirming = confirmRemoveId !== null && confirmRemoveId === id;
                  const dragging = dragIndex === index;
                  const dropTarget = dragOverIndex === index && dragIndex !== null && dragIndex !== index;

                  return (
                    <li
                      key={id || `${getDestinationName(destination)}-${index}`}
                      className={`rp-stop-wrap ${dragging ? "is-dragging" : ""} ${dropTarget ? "is-drop-target" : ""}`}
                      onDragOver={(event) => {
                        if (dragIndex === null) return;
                        event.preventDefault();
                        if (dragOverIndex !== index) setDragOverIndex(index);
                      }}
                      onDrop={(event) => {
                        event.preventDefault();
                        if (dragIndex !== null) reorderTo(dragIndex, index);
                        setDragIndex(null);
                        setDragOverIndex(null);
                      }}
                    >
                      {index > 0 && (
                        <div className="rp-leg" aria-label={`From ${getDestinationName(destinations[index - 1])} to ${getDestinationName(destination)}`}>
                          <span className="rp-leg-line" aria-hidden="true" />
                          {routeSummaryLoading ? (
                            <span className="rp-leg-chip"><i className="rp-skel" /></span>
                          ) : leg ? (
                            <span className="rp-leg-chip">
                              🚗 {formatDistance(leg.distanceKm)} · {formatDuration(leg.durationMinutes)}
                              {routeSummary?.approximate && <em title="Estimated, not live road data"> ≈</em>}
                            </span>
                          ) : (
                            <span className="rp-leg-chip rp-leg-muted">Distance not available</span>
                          )}
                        </div>
                      )}

                      <div className="rp-stop">
                        <span
                          className="rp-handle"
                          draggable={reorderingId === null}
                          onDragStart={(event) => {
                            event.dataTransfer.effectAllowed = "move";
                            event.dataTransfer.setData("text/plain", String(index));
                            setDragIndex(index);
                          }}
                          onDragEnd={() => {
                            setDragIndex(null);
                            setDragOverIndex(null);
                          }}
                          title="Drag to reorder"
                          aria-hidden="true"
                        >
                          ⠿
                        </span>

                        <span className="rp-stop-number">{index + 1}</span>

                        <div className="rp-stop-body">
                          <strong>{getDestinationName(destination)}</strong>
                          <span>
                            {category ? category : "No category yet"}
                            {destination?.bestTime ? ` · Best: ${destination.bestTime}` : ""}
                          </span>
                        </div>

                        {confirming ? (
                          <div className="rp-stop-actions rp-confirm" role="group" aria-label="Confirm removal">
                            <span>Remove this stop?</span>
                            <button
                              type="button"
                              className="rp-danger"
                              onClick={() => {
                                setConfirmRemoveId(null);
                                handleRemoveDestination(destination);
                              }}
                            >
                              Remove
                            </button>
                            <button type="button" onClick={() => setConfirmRemoveId(null)}>Keep</button>
                          </div>
                        ) : (
                          <div className="rp-stop-actions">
                            <button
                              type="button"
                              onClick={() => handleEditDestination(destination)}
                              aria-label={`Edit details for ${getDestinationName(destination)}`}
                            >
                              Edit
                            </button>
                            <button
                              type="button"
                              onClick={() => reorderTo(index, index - 1)}
                              disabled={index === 0 || reorderingId !== null}
                              aria-label={`Move ${getDestinationName(destination)} up`}
                            >
                              ↑
                            </button>
                            <button
                              type="button"
                              onClick={() => reorderTo(index, index + 1)}
                              disabled={index === destinations.length - 1 || reorderingId !== null}
                              aria-label={`Move ${getDestinationName(destination)} down`}
                            >
                              ↓
                            </button>
                            <button
                              type="button"
                              className="rp-icon-danger"
                              onClick={() => setConfirmRemoveId(id)}
                              disabled={removingId === id}
                              aria-label={`Remove ${getDestinationName(destination)}`}
                            >
                              {removingId === id ? "…" : "×"}
                            </button>
                          </div>
                        )}
                      </div>
                    </li>
                  );
                })}
              </ol>
            )}
          </section>

          {/* ---------- RIGHT: overview ---------- */}

          <aside className="rp-card rp-overview" aria-labelledby="rp-overview-title">
            <div className="rp-card-head">
              <div>
                <h2 id="rp-overview-title">Route overview</h2>
                <p>Distance and time for each leg of the journey.</p>
              </div>
            </div>

            {destinations.length < 2 ? (
              <div className="rp-empty rp-empty-small">
                <span aria-hidden="true">🗺️</span>
                <p>
                  {destinations.length === 0
                    ? "Add two or more stops to see your route."
                    : "Add one more stop to calculate the route."}
                </p>
              </div>
            ) : routeSummaryError ? (
              <div className="rp-alert rp-alert-error" role="alert">
                <span>{routeSummaryError}</span>
                <button type="button" className="rp-retry" onClick={() => setRouteReloadKey((value) => value + 1)}>
                  Try again
                </button>
              </div>
            ) : routeSummaryLoading ? (
              <div className="rp-skeleton-list" aria-busy="true" aria-label="Calculating route">
                <i /><i /><i />
              </div>
            ) : routeSummary ? (
              <>
                <div className={`rp-source ${routeSummary.approximate ? "is-estimate" : "is-live"}`}>
                  <strong>
                    {routeSummary.approximate ? "Approximate estimate" : "Road route"}
                  </strong>
                  <span>
                    {routeSummary.approximate
                      ? routeSummary.notice || "Live road routing is unavailable, so these numbers are estimated from straight-line distance."
                      : "Driving distance and time from the OpenStreetMap routing service. Traffic is not included."}
                  </span>
                </div>

                <div className="rp-totals">
                  <div>
                    <span>Total distance</span>
                    <strong>{formatDistance(routeSummary.totalDistanceKm)}</strong>
                  </div>
                  <div>
                    <span>Driving time</span>
                    <strong>{formatDuration(routeSummary.totalDurationMinutes)}</strong>
                  </div>
                </div>

                <ul className="rp-legs">
                  {routeLegs.map((leg, index) => (
                    <li key={`${leg.fromDestinationId}-${leg.toDestinationId}-${index}`}>
                      <div className="rp-leg-row">
                        <span className="rp-leg-names">
                          <b>{index + 1}</b> {leg.fromName} <span aria-hidden="true">→</span> {leg.toName}
                        </span>
                        <span className="rp-leg-values">
                          {formatDistance(leg.distanceKm)} · {formatDuration(leg.durationMinutes)}
                        </span>
                      </div>
                      <div className="rp-leg-bar" aria-hidden="true">
                        <i style={{ width: `${Math.max(4, Math.round((Number(leg.distanceKm) / longestLegKm) * 100))}%` }} />
                      </div>
                    </li>
                  ))}
                </ul>
              </>
            ) : null}
          </aside>
        </div>

        {/* =================================================
            DESTINATION INFORMATION
        ================================================= */}

        <section className="destination-information-card">
          <div className="destination-information-header">
            <div>
              <span>
                DESTINATION DETAILS
              </span>

              <h2>
                📋 Destination Information
              </h2>

              <p>
                Detailed destination
                information for your
                selected trip.
              </p>
            </div>
          </div>

          {editingDestinationId !== null && (
            <form
              onSubmit={handleSaveDestinationEdit}
              style={{
                margin: "18px 0",
                padding: "20px",
                border: "1px solid #d9e2ec",
                borderRadius: "12px",
                background: "#f8fafc",
              }}
            >
              <h3 style={{ marginTop: 0 }}>Edit destination details</h3>
              <p style={{ marginTop: 0 }}>
                Updating: <strong>{getDestinationName(destinations.find((item) => String(getDestinationId(item)) === String(editingDestinationId)))}</strong>
              </p>

              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(190px, 1fr))", gap: "14px" }}>
                <label>
                  Category
                  <input name="category" value={destinationEditForm.category} onChange={handleDestinationEditChange} placeholder="e.g. Museum, Park" />
                </label>
                <label>
                  Best time to visit
                  <input name="bestTime" value={destinationEditForm.bestTime} onChange={handleDestinationEditChange} placeholder="e.g. Morning" />
                </label>
                <label>
                  Opening time
                  <input type="time" name="openingTime" value={destinationEditForm.openingTime} onChange={handleDestinationEditChange} />
                </label>
                <label>
                  Closing time
                  <input type="time" name="closingTime" value={destinationEditForm.closingTime} onChange={handleDestinationEditChange} />
                </label>
                <label>
                  Ticket price (₹)
                  <input type="number" min="0" step="0.01" name="ticketPrice" value={destinationEditForm.ticketPrice} onChange={handleDestinationEditChange} placeholder="0" />
                </label>
                <label>
                  Expected duration (minutes)
                  <input type="number" min="1" step="1" name="expectedDuration" value={destinationEditForm.expectedDuration} onChange={handleDestinationEditChange} placeholder="e.g. 90" />
                </label>
                <label>
                  Popularity (0–5)
                  <input type="number" min="0" max="5" step="0.1" name="popularity" value={destinationEditForm.popularity} onChange={handleDestinationEditChange} placeholder="e.g. 4.5" />
                </label>
                <label>
                  Indoor / Outdoor
                  <select name="indoorOutdoor" value={destinationEditForm.indoorOutdoor} onChange={handleDestinationEditChange}>
                    <option value="">Not specified</option>
                    <option value="INDOOR">Indoor</option>
                    <option value="OUTDOOR">Outdoor</option>
                    <option value="BOTH">Both</option>
                  </select>
                </label>
              </div>

              <div style={{ display: "flex", flexWrap: "wrap", gap: "18px", margin: "16px 0" }}>
                <label style={{ display: "flex", alignItems: "center", gap: "7px" }}>
                  <input type="checkbox" name="familyFriendly" checked={destinationEditForm.familyFriendly} onChange={handleDestinationEditChange} />
                  Family friendly
                </label>
                <label style={{ display: "flex", alignItems: "center", gap: "7px" }}>
                  <input type="checkbox" name="wheelchairFriendly" checked={destinationEditForm.wheelchairFriendly} onChange={handleDestinationEditChange} />
                  Wheelchair friendly
                </label>
                <label style={{ display: "flex", alignItems: "center", gap: "7px" }}>
                  <input type="checkbox" name="kidsFriendly" checked={destinationEditForm.kidsFriendly} onChange={handleDestinationEditChange} />
                  Kids friendly
                </label>
              </div>

              {destinationEditError && (
                <p role="alert" style={{ color: "#b42318", margin: "10px 0" }}>
                  {destinationEditError}
                </p>
              )}

              <div style={{ display: "flex", gap: "10px", flexWrap: "wrap" }}>
                <button type="button" onClick={handleCancelDestinationEdit} disabled={destinationEditSaving}>
                  Cancel
                </button>
                <button type="submit" disabled={destinationEditSaving}>
                  {destinationEditSaving ? "Saving..." : "Save Details"}
                </button>
              </div>
            </form>
          )}

          {destinations.length ===
          0 ? (
            <div className="destination-information-empty">
              Add destinations to see
              detailed information here.
            </div>
          ) : (
            <div className="destination-table-wrapper">
              <table className="destination-table">
                <thead>
                  <tr>
                    <th>
                      ORDER
                    </th>
                    <th>
                      DESTINATION
                    </th>
                    <th>
                      CATEGORY
                    </th>
                    <th>
                      BEST TIME
                    </th>
                    <th>
                      OPENING
                    </th>
                    <th>
                      CLOSING
                    </th>
                    <th>
                      TICKET
                    </th>
                    <th>
                      DURATION
                    </th>
                    <th>
                      POPULARITY
                    </th>
                    <th>
                      TYPE
                    </th>
                    <th>
                      FAMILY
                    </th>
                    <th>
                      WHEELCHAIR
                    </th>
                    <th>
                      KIDS
                    </th>
                  </tr>
                </thead>

                <tbody>
                  {destinations.map(
                    (
                      destination,
                      index
                    ) => (
                      <tr
                        key={
                          getDestinationId(
                            destination
                          ) ||
                          index
                        }
                      >
                        <td>
                          <span className="destination-order-pill">
                            {index + 1}
                          </span>
                        </td>

                        <td>
                          <strong>
                            {getDestinationName(
                              destination
                            )}
                          </strong>

                          <small>
                            {displayValue(
                              destination?.latitude
                            )}
                            ,{" "}
                            {displayValue(
                              destination?.longitude
                            )}
                          </small>
                        </td>

                        <td>
                          {displayValue(
                            getDestinationField(
                              destination,
                              "category"
                            )
                          )}
                        </td>

                        <td>
                          {displayValue(
                            getDestinationField(
                              destination,
                              "bestTime",
                              "best_time"
                            )
                          )}
                        </td>

                        <td>
                          {displayValue(
                            getDestinationField(
                              destination,
                              "openingTime",
                              "opening_time"
                            )
                          )}
                        </td>

                        <td>
                          {displayValue(
                            getDestinationField(
                              destination,
                              "closingTime",
                              "closing_time"
                            )
                          )}
                        </td>

                        <td>
                          ₹
                          {displayValue(
                            getDestinationField(
                              destination,
                              "ticketPrice",
                              "ticket_price"
                            )
                          )}
                        </td>

                        <td>
                          {displayValue(
                            getDestinationField(
                              destination,
                              "expectedDuration",
                              "expected_duration",
                              "duration"
                            )
                          )}
                        </td>

                        <td>
                          {displayValue(
                            getDestinationField(
                              destination,
                              "popularity"
                            )
                          )}
                        </td>

                        <td>
                          {displayValue(
                            getDestinationField(
                              destination,
                              "indoorOutdoor",
                              "indoor_outdoor"
                            )
                          )}
                        </td>

                        <td>
                          {displayValue(
                            getDestinationField(
                              destination,
                              "familyFriendly",
                              "family_friendly"
                            )
                          )}
                        </td>

                        <td>
                          {displayValue(
                            getDestinationField(
                              destination,
                              "wheelchairFriendly",
                              "wheelchair_friendly"
                            )
                          )}
                        </td>

                        <td>
                          {displayValue(
                            getDestinationField(
                              destination,
                              "kidsFriendly",
                              "kids_friendly"
                            )
                          )}
                        </td>
                      </tr>
                    )
                  )}
                </tbody>
              </table>
            </div>
          )}
        </section>

        {/* JOURNEY ORDER */}

        <section className="route-insight-card">
          <span>
            JOURNEY ORDER
          </span>

          <h2>
            Route sequence
          </h2>

          <div className="route-sequence">
            {destinations.map(
              (
                destination,
                index
              ) => (
                <div
                  className="route-sequence-item"
                  key={index}
                >
                  <span>
                    {index + 1}
                  </span>

                  <strong>
                    {getDestinationName(
                      destination
                    )}
                  </strong>

                  {index <
                    destinations.length -
                      1 && (
                    <b>
                      →
                    </b>
                  )}
                </div>
              )
            )}
          </div>
        </section>

        {/* =================================================
            MODULE 6
        ================================================= */}

        <section
          className="module6-itinerary-card"
          id="module6-itinerary"
        >
          <div className="module6-header">
            <div className="module6-header-main">
              <div className="module6-icon">
                📅
              </div>

              <div>
                <span className="module6-eyebrow">
                  DAY-BY-DAY PLAN
                </span>

                <h2>
                  Itinerary Generation Engine
                </h2>

                <p>
                  Plan a realistic round trip with road ETAs, meal breaks,
                  overnight continuity, and a final return to your starting point.
                </p>
              </div>
            </div>

            <div className="module6-header-actions">
              <button
                type="button"
                className="module6-secondary-button"
                onClick={() =>
                  openAddActivityModal(
                    1
                  )
                }
              >
                + Add Activity
              </button>

              <button
                type="button"
                className="module6-primary-button"
                onClick={
                  generateItinerary
                }
                disabled={
                  itineraryGenerating || itineraryLoading
                }
              >
                {itineraryGenerating
                  ? "Generating..."
                  : itineraryStats.total
                  ? "↻ Regenerate"
                  : "✨ Generate Itinerary"}
              </button>

              <button
                type="button"
                className="module6-save-button"
                onClick={
                  saveItinerary
                }
              >
                {itinerarySaving
                  ? "Saving..."
                  : "💾 Save"}
              </button>
            </div>
          </div>

          <div className="module6-options">
            <label>
              <input
                type="checkbox"
                checked={roundTrip}
                disabled={itineraryGenerating}
                onChange={(event) =>
                  setRoundTrip(event.target.checked)
                }
              />
              Round trip (return to {trip?.origin || "the starting point"})
            </label>

            <label>
              <input
                type="checkbox"
                checked={optimizeRoute}
                disabled={itineraryGenerating}
                onChange={(event) =>
                  setOptimizeRoute(event.target.checked)
                }
              />
              Optimise visiting order
            </label>

            <span className="module6-mode-pill">
              {roundTrip ? "ROUND TRIP" : "ONE-WAY"}
              {optimizeRoute ? " · OPTIMISED ORDER" : " · YOUR ORDER"}
            </span>
          </div>

          <div className="module6-info-strip">
            <div>
              <span>
                ACTIVITIES
              </span>

              <strong>
                {itineraryStats.total}
              </strong>
            </div>

            <div>
              <span>
                DAYS PLANNED
              </span>

              <strong>
                {itineraryStats.days}/
                {tripDays}
              </strong>
            </div>

            <div>
              <span>
                LOCKED
              </span>

              <strong>
                {itineraryStats.locked}
              </strong>
            </div>

            <div className="module6-info-note">
              <span>
                SMART REGENERATION
              </span>

              <p>
                Locked activities
                remain protected.
              </p>
            </div>
          </div>

          {itinerarySummary && itinerarySummary.activityCount > 0 && (
            <div className="module6-summary">
              <div className="module6-summary-title">
                <span>
                  {itinerarySummary.returnIncluded
                    ? "ROUND-TRIP SUMMARY"
                    : "ROUTE SUMMARY (ONE-WAY)"}
                </span>
                <span>
                  {itinerarySummary.hasEstimatedTravel
                    ? "≈ includes estimated travel times"
                    : "road travel times from OSRM"}
                </span>
              </div>

              <div className="module6-summary-grid">
                <div>
                  <span>TOTAL DISTANCE</span>
                  <strong>
                    {Number(itinerarySummary.totalDistanceKm || 0).toFixed(1)} km
                  </strong>
                </div>
                <div>
                  <span>TRAVEL TIME</span>
                  <strong>
                    {formatMinutesLong(itinerarySummary.totalTravelMinutes)}
                  </strong>
                </div>
                <div>
                  <span>VISIT TIME</span>
                  <strong>
                    {formatMinutesLong(itinerarySummary.totalVisitMinutes)}
                  </strong>
                </div>
                <div>
                  <span>BREAKS &amp; FREE TIME</span>
                  <strong>
                    {formatMinutesLong(itinerarySummary.totalBreakMinutes)}
                  </strong>
                </div>
                <div>
                  <span>OVERNIGHT</span>
                  <strong>
                    {formatMinutesLong(itinerarySummary.totalOvernightMinutes)}
                  </strong>
                </div>
                <div>
                  <span>RETURN JOURNEY</span>
                  <strong>
                    {itinerarySummary.returnIncluded
                      ? `${Number(itinerarySummary.returnDistanceKm || 0).toFixed(1)} km · ${formatMinutesLong(itinerarySummary.returnTravelMinutes)}`
                      : "not included"}
                  </strong>
                </div>
              </div>

              {Array.isArray(itinerarySummary.days) &&
                itinerarySummary.days.length > 0 && (
                  <div className="module6-summary-days">
                    {itinerarySummary.days.map((summaryDay) => (
                      <span key={summaryDay.date}>
                        {formatShortDate(summaryDay.date)}:{" "}
                        {formatMinutesLong(summaryDay.scheduledMinutes)} scheduled
                      </span>
                    ))}
                  </div>
                )}

              {Array.isArray(itinerarySummary.warnings) &&
                itinerarySummary.warnings.length > 0 && (
                  <ul className="module6-summary-warnings">
                    {itinerarySummary.warnings.map((warning, index) => (
                      <li key={index}>{warning}</li>
                    ))}
                  </ul>
                )}
            </div>
          )}

          {itineraryMessage && (
            <div className="module6-alert module6-success">
              ✓ {itineraryMessage}

              <button
                type="button"
                onClick={() =>
                  setItineraryMessage(
                    ""
                  )
                }
              >
                ×
              </button>
            </div>
          )}

          {itineraryError && (
            <div className="module6-alert module6-error">
              ⚠️ {itineraryError}

              <button
                type="button"
                onClick={() =>
                  setItineraryError("")
                }
              >
                ×
              </button>
            </div>
          )}

          {itineraryLoading ? (
            <div className="module6-loading">
              Loading itinerary...
            </div>
          ) : (
            <div className="module6-days">
              {itinerary.map(
                (day) => (
                  <section
                    className="module6-day-card"
                    key={day.day}
                    onDragOver={(event) =>
                      event.preventDefault()
                    }
                    onDrop={(event) =>
                      handleDrop(
                        event,
                        day.day
                      )
                    }
                  >
                    <div className="module6-day-header">
                      <div>
                        <span>
                          DAY{" "}
                          {String(
                            day.day
                          ).padStart(
                            2,
                            "0"
                          )}
                        </span>

                        <h3>
                          {day.day ===
                          1
                            ? "Day One"
                            : `Day ${day.day}`}
                        </h3>
                      </div>

                      <button
                        type="button"
                        className="module6-day-add"
                        onClick={() =>
                          openAddActivityModal(
                            day.day
                          )
                        }
                      >
                        + Add
                      </button>
                    </div>

                    {day.activities
                      .length === 0 ? (
                      <div className="module6-empty-day">
                        <strong>
                          Nothing planned yet
                        </strong>

                        <p>
                          Generate the
                          itinerary or
                          add an activity
                          manually.
                        </p>

                        <button
                          type="button"
                          onClick={() =>
                            openAddActivityModal(
                              day.day
                            )
                          }
                        >
                          Add Activity
                        </button>
                      </div>
                    ) : (
                      <div className="module6-activity-list">
                        {day.activities.map(
                          (
                            activity,
                            activityIndex
                          ) => (
                            <article
                              key={
                                activity.id ?? `activity-${day.day}-${activityIndex}`
                              }
                              data-type={activity.activityType}
                              className={`module6-activity ${
                                activity.locked
                                  ? "module6-activity-locked"
                                  : ""
                              }`}
                              draggable={
                                !activity.locked
                              }
                              onDragStart={() =>
                                handleDragStart(
                                  day.day,
                                  activity.id
                                )
                              }
                              onDragOver={(
                                event
                              ) =>
                                handleDragOver(
                                  event,
                                  day.day,
                                  activity.id
                                )
                              }
                              onDrop={(event) =>
                                handleDrop(
                                  event,
                                  day.day,
                                  activity.id
                                )
                              }
                              onDragEnd={
                                handleDragEnd
                              }
                            >
                              <div className="module6-time-column">
                                <strong>
                                  {
                                    activity.time
                                  }
                                </strong>

                                {activity.endTime && (
                                  <span className="module6-time-end">
                                    → {activity.endTime}
                                  </span>
                                )}

                                {activity.crossesMidnight && (
                                  <span className="module6-next-day">
                                    +{activity.endDayOffset} day
                                  </span>
                                )}

                                <span>
                                  {formatDuration(
                                    activity.duration
                                  )}
                                </span>
                              </div>

                              <div className="module6-activity-body">
                                <div className="module6-activity-top">
                                  <div>
                                    <div className="module6-activity-title-row">
                                      <h4>
                                        {
                                          activity.title
                                        }
                                      </h4>

                                      {activity.locked && (
                                        <span className="module6-lock-badge">
                                          🔒
                                        </span>
                                      )}

                                      <span
                                        className={`module6-type-badge module6-type-${activity.activityType}`}
                                      >
                                        {ACTIVITY_TYPE_META[activity.activityType]?.icon}{" "}
                                        {ACTIVITY_TYPE_META[activity.activityType]?.label}
                                      </span>
                                    </div>

                                    {(activity.activityType === "TRAVEL" ||
                                      activity.activityType === "RETURN" ||
                                      activity.estimated) && (
                                      <div className="module6-meta-row">
                                        {(activity.activityType === "TRAVEL" ||
                                          activity.activityType === "RETURN") && (
                                          <span className="module6-meta-chip">
                                            Travel time {formatMinutesLong(activity.duration)}
                                          </span>
                                        )}
                                        {activity.distanceKm !== null && (
                                          <span className="module6-meta-chip">
                                            {activity.distanceKm.toFixed(1)} km
                                          </span>
                                        )}
                                        {activity.activityType === "VISIT" && (
                                          <span className="module6-meta-chip">
                                            Visit time {formatMinutesLong(activity.duration)}
                                          </span>
                                        )}
                                        {activity.estimated && (
                                          <span className="module6-meta-chip module6-estimate">
                                            ≈ estimated
                                            {activity.routeSource === "ESTIMATE"
                                              ? " (routing unavailable)"
                                              : ""}
                                          </span>
                                        )}
                                      </div>
                                    )}

                                    {activity.location && (
                                      <span className="module6-location">
                                        📍{" "}
                                        {
                                          activity.location
                                        }
                                      </span>
                                    )}
                                  </div>

                                  {!activity.locked && (
                                    <span className="module6-drag-handle">
                                      ⋮⋮
                                    </span>
                                  )}
                                </div>

                                {activity.notes && (
                                  <p className="module6-activity-notes">
                                    {
                                      activity.notes
                                    }
                                  </p>
                                )}

                                <div className="module6-activity-actions">
                                  <button
                                    type="button"
                                    onClick={() =>
                                      moveActivity(
                                        day.day,
                                        activityIndex,
                                        -1
                                      )
                                    }
                                    disabled={
                                      activityIndex ===
                                        0 ||
                                      activity.locked ||
                                      day.activities[
                                        activityIndex -
                                          1
                                      ]?.locked
                                    }
                                  >
                                    ↑
                                  </button>

                                  <button
                                    type="button"
                                    onClick={() =>
                                      moveActivity(
                                        day.day,
                                        activityIndex,
                                        1
                                      )
                                    }
                                    disabled={
                                      activityIndex ===
                                        day.activities.length -
                                          1 ||
                                      activity.locked ||
                                      day.activities[
                                        activityIndex +
                                          1
                                      ]?.locked
                                    }
                                  >
                                    ↓
                                  </button>

                                  <button
                                    type="button"
                                    onClick={() =>
                                      toggleActivityLock(
                                        day.day,
                                        activity.id
                                      )
                                    }
                                  >
                                    {activity.locked
                                      ? "🔓 Unlock"
                                      : "🔒 Lock"}
                                  </button>

                                  <button
                                    type="button"
                                    onClick={() =>
                                      openEditActivityModal(
                                        activity,
                                        day.day
                                      )
                                    }
                                    disabled={
                                      activity.locked
                                    }
                                  >
                                    ✏️ Edit
                                  </button>

                                  <button
                                    type="button"
                                    onClick={() =>
                                      removeActivity(
                                        day.day,
                                        activity.id
                                      )
                                    }
                                    disabled={
                                      activity.locked
                                    }
                                  >
                                    🗑
                                  </button>
                                </div>
                              </div>
                            </article>
                          )
                        )}
                      </div>
                    )}
                  </section>
                )
              )}
            </div>
          )}

          <div className="module6-footer">
            <span>
              💡 Drag activities to
              rearrange them.
            </span>

            <span>
              🔒 Locked activities
              survive regeneration.
            </span>

            <span>
              💾 Save stores the
              itinerary on this device.
            </span>
          </div>
        </section>

        {/* FOOTER */}

        <div className="route-planner-footer">
          Route planning, destination
          information and itinerary
          generation are managed from
          this trip workspace.
        </div>
      </div>

      {/* =================================================
          ACTIVITY MODAL
      ================================================= */}

      {activityModalOpen && (
        <div
          className="module6-modal-overlay"
          onMouseDown={(event) => {
            if (
              event.target ===
              event.currentTarget
            ) {
              closeActivityModal();
            }
          }}
        >
          <div className="module6-modal">
            <div className="module6-modal-header">
              <div>
                <span className="module6-eyebrow">
                  DAY-BY-DAY PLAN
                </span>

                <h2>
                  {editingActivity
                    ? "Edit Activity"
                    : "Add Activity"}
                </h2>
              </div>

              <button
                type="button"
                className="module6-modal-close"
                onClick={
                  closeActivityModal
                }
              >
                ×
              </button>
            </div>

            <form
              className="module6-form"
              onSubmit={
                handleActivitySubmit
              }
            >
              <div className="module6-form-grid">
                <label>
                  <span>
                    Day
                  </span>

                  <select
                    name="day"
                    value={
                      activityForm.day
                    }
                    onChange={
                      handleActivityFormChange
                    }
                  >
                    {Array.from(
                      {
                        length:
                          tripDays,
                      },
                      (_, index) => (
                        <option
                          key={
                            index + 1
                          }
                          value={
                            index + 1
                          }
                        >
                          Day{" "}
                          {index + 1}
                        </option>
                      )
                    )}
                  </select>
                </label>

                <label>
                  <span>
                    Time
                  </span>

                  <input
                    type="time"
                    name="time"
                    value={
                      activityForm.time
                    }
                    onChange={
                      handleActivityFormChange
                    }
                  />
                </label>
              </div>

              <label>
                <span>
                  Activity Name *
                </span>

                <input
                  type="text"
                  name="title"
                  value={
                    activityForm.title
                  }
                  onChange={
                    handleActivityFormChange
                  }
                  placeholder="e.g. Visit Marina Beach"
                />
              </label>

              <label>
                <span>
                  Location
                </span>

                <input
                  type="text"
                  name="location"
                  value={
                    activityForm.location
                  }
                  onChange={
                    handleActivityFormChange
                  }
                  placeholder="e.g. Chennai"
                />
              </label>

              <label>
                <span>
                  Duration
                </span>

                <select
                  name="duration"
                  value={
                    activityForm.duration
                  }
                  onChange={
                    handleActivityFormChange
                  }
                >
                  <option value="30">
                    30 minutes
                  </option>

                  <option value="60">
                    1 hour
                  </option>

                  <option value="90">
                    1.5 hours
                  </option>

                  <option value="120">
                    2 hours
                  </option>

                  <option value="180">
                    3 hours
                  </option>

                  <option value="240">
                    4 hours
                  </option>
                </select>
              </label>

              <label>
                <span>
                  Notes
                </span>

                <textarea
                  name="notes"
                  value={
                    activityForm.notes
                  }
                  onChange={
                    handleActivityFormChange
                  }
                  placeholder="Add notes or booking information..."
                  rows="4"
                />
              </label>

              <div className="module6-modal-actions">
                <button
                  type="button"
                  className="module6-cancel-button"
                  onClick={
                    closeActivityModal
                  }
                >
                  Cancel
                </button>

                <button
                  type="submit"
                  className="module6-primary-button"
                >
                  {editingActivity
                    ? "Save Changes"
                    : "Add Activity"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

export default RoutePlanner;
