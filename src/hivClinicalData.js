// Clinical profile of each asset for the "Clinical" view, keyed by asset id.
// Every efficacy figure is linked to the label, publication or company release it was read from;
// "Not verified" means no source confirmed the value. Researched 13 Oct 2026.
export const CLINICAL_VERIFIED_ON = '2026-10-13';
export const CLINICAL = {
  "biktarvy": {
    "route_frequency": "Oral, once daily",
    "clinic_visits": "Self-administered",
    "food": "With or without food",
    "population": "Treatment-naive adults (pivotal trials); label covers adults and children >=14 kg, including suppressed switch",
    "pivotal_trials": "GS-US-380-1489, GS-US-380-1490 (treatment-naive); switch trials 1844, 1878, 4030",
    "comparator": "1489: abacavir/dolutegravir/lamivudine (ABC/DTG/3TC); 1490: dolutegravir + FTC/TAF",
    "efficacy": "HIV-1 RNA <50 copies/mL at week 144: 82% vs 84% (1489, vs ABC/DTG/3TC) and 82% vs 84% (1490, vs DTG + FTC/TAF)",
    "safety": "Most common adverse reactions (>=5%) were diarrhea (6%/3%), nausea (6%/3%) and headache (5%/4%) in trials 1489/1490 through week 144",
    "source": "https://www.gilead.com/-/media/files/pdfs/medicines/hiv/biktarvy/biktarvy_pi.pdf",
    "source_label": "FDA label (Gilead PI)",
    "status_note": "Approved (FDA). Week-48 primary results not captured; label reports week 144"
  },
  "bixlenvo": {
    "route_frequency": "Oral, once daily (days 1-2 also take 600 mg Sunlenca tablets as a loading dose)",
    "clinic_visits": "Self-administered",
    "food": "With or without food",
    "population": "Virologically suppressed adults switching therapy, including those on complex multi-tablet regimens",
    "pivotal_trials": "ARTISTRY-1, ARTISTRY-2",
    "comparator": "ARTISTRY-1: stable complex multi-tablet regimen; ARTISTRY-2: continued Biktarvy (double-blind)",
    "efficacy": "HIV-1 RNA >=50 copies/mL at week 48: 1.3% vs 1.0% with Biktarvy (ARTISTRY-2) and 0.8% vs 1.1% with complex regimens (ARTISTRY-1); both non-inferior",
    "safety": "Drug-related AEs 10.4% vs 12.0% (ARTISTRY-2) and 14.3% vs 1.6% (ARTISTRY-1); AE discontinuations 1.6% in both ARTISTRY-2 arms; weight/BMI stable",
    "source": "https://www.gilead.com/news/news-details/2026/gileads-single-tablet-regimen-of-bictegravir-and-lenacapavir-maintained-virological-suppression-in-people-with-hiv-who-switched-antiretroviral-therapy",
    "source_label": "Gilead press release (CROI 2026)",
    "status_note": "FDA approved August 2026 (Gilead release dated Aug 27, 2026)",
    "additional_sources": [
      "https://www.businesswire.com/news/home/20260817093045/en/U.S.-FDA-Approves-Gileads-Bixlenvo-a-New-Once-Daily-Single-Tablet-Option-for-Virologically-Suppressed-Adults-With-HIV-Including-Those-on-Complex-Regimens"
    ]
  },
  "isl-len": {
    "route_frequency": "Oral, once weekly",
    "clinic_visits": "Self-administered",
    "food": "Not verified",
    "population": "Virologically suppressed adults switching therapy",
    "pivotal_trials": "ISLEND-1, ISLEND-2",
    "comparator": "ISLEND-1: continued daily Biktarvy (double-blind); ISLEND-2: continued daily standard-of-care oral regimen (open-label)",
    "efficacy": "HIV-1 RNA >=50 copies/mL at week 48: 0% vs 0.3% with Biktarvy (ISLEND-1) and 0.3% vs 1.3% with standard of care (ISLEND-2)",
    "safety": "Treatment-related AEs 13.5% vs 13.2% (ISLEND-1) and 18% vs <1% (ISLEND-2), mainly headache and nausea; CD4 and lymphocyte counts stable, no weight difference",
    "source": "https://www.businesswire.com/news/home/20260720061462/en/Investigational-Once-Weekly-Oral-HIV-Treatment-Regimen-of-Islatravir-and-Lenacapavir-Maintained-Virological-Suppression-in-Adults-With-HIV-Who-Switched-Antiretroviral-Therapy",
    "source_label": "Gilead/Merck press release, Jul 2026",
    "status_note": "Phase 3; investigational, not approved (as of Jul 2026 release; regulatory submissions planned)"
  },
  "sunlenca": {
    "route_frequency": "Subcutaneous injection every 6 months, after oral + subcutaneous initiation (days 1-2, or days 1, 2, 8 and 15)",
    "clinic_visits": "HCP-administered abdominal subcutaneous injection every 6 months",
    "food": "Not applicable (initiation tablets may be taken with or without food)",
    "population": "Heavily treatment-experienced adults with multidrug resistance",
    "pivotal_trials": "CAPELLA",
    "comparator": "Placebo during the 14-day functional monotherapy period (cohort 1), then open-label with optimized background regimen",
    "efficacy": ">=0.5 log10 viral load decline at end of functional monotherapy: 87.5% vs 16.7% with placebo; HIV-1 RNA <50 copies/mL with OBR: 81% at week 26 and 83% at week 52",
    "safety": "Injection-site reactions in 65% of participants through week 52 (mostly grade 1-2); nausea 4%",
    "source": "https://www.gilead.com/-/media/files/pdfs/medicines/hiv/sunlenca/sunlenca_pi.pdf",
    "source_label": "FDA label (Gilead PI)",
    "status_note": "Approved (FDA); used with other antiretrovirals"
  },
  "dovato": {
    "route_frequency": "Oral, once daily",
    "clinic_visits": "Self-administered",
    "food": "With or without food",
    "population": "Treatment-naive adults/adolescents, or virologically suppressed patients switching (no prior failure or resistance)",
    "pivotal_trials": "GEMINI-1, GEMINI-2, TANGO",
    "comparator": "GEMINI: dolutegravir + Truvada (FTC/TDF); TANGO: continued TAF-based regimen of >=3 drugs",
    "efficacy": "HIV-1 RNA <50 copies/mL at week 48: 91% vs 93% with DTG + Truvada (GEMINI pooled); TANGO switch: 93.2% vs 93.0%, snapshot failure <1% in both arms",
    "safety": "GEMINI week 144: headache 3%, nausea/diarrhea/insomnia 2%; TANGO: AE withdrawals 4% vs <1%, weight increased 3%",
    "source": "https://www.drugs.com/pro/dovato.html",
    "source_label": "FDA label (via Drugs.com)",
    "status_note": "Approved (FDA)",
    "additional_sources": [
      "https://us.gsk.com/en-us/media/press-releases/viiv-healthcare-announces-positive-week-48-results-in-first-study-to-evaluate-treatment-switch-from-taf-containing-regimen"
    ]
  },
  "cab-rpv": {
    "route_frequency": "Intramuscular (gluteal) injection monthly or every 2 months; optional 28-day oral lead-in",
    "clinic_visits": "HCP-administered, monthly or every 2 months",
    "food": "Not applicable (optional oral lead-in Vocabria + Edurant taken with a meal)",
    "population": "Virologically suppressed adults and adolescents (>=12 years, >=35 kg) switching therapy",
    "pivotal_trials": "ATLAS, FLAIR, ATLAS-2M",
    "comparator": "ATLAS: continued oral ART; FLAIR: continued Triumeq (ABC/DTG/3TC); ATLAS-2M: monthly vs every-2-month dosing",
    "efficacy": "HIV-1 RNA <50 copies/mL at week 48: 92.5% vs 95.5% (ATLAS) and 93.6% vs 93.3% (FLAIR); ATLAS-2M every 2 months 94.3% vs monthly 93.5%",
    "safety": "Injection-site reactions in 83% (monthly, FLAIR/ATLAS pooled) and 75% (every 2 months); pyrexia 8%, fatigue 5%; ~1.3-1.4% withdrew for injection-related events",
    "source": "https://us.gsk.com/en-us/media/press-releases/viiv-healthcare-presents-positive-48-week-data-from-two-pivotal-phase-iii-studies/",
    "source_label": "ViiV press release (CROI 2019)",
    "status_note": "Approved (FDA: Cabenuva; EU: Vocabria + Rekambys)",
    "additional_sources": [
      "https://viivhealthcare.com/hiv-news-and-media/news/press-releases/2020/march/viiv-healthcare-presents-positive--48-week-data-from-phase-iii-s/",
      "https://www.drugs.com/pro/cabenuva.html"
    ]
  },
  "idvynso": {
    "route_frequency": "Oral, once daily",
    "clinic_visits": "Self-administered",
    "food": "With or without food",
    "population": "Virologically suppressed adults switching therapy, with no history of virologic failure",
    "pivotal_trials": "MK-8591A Trial 051, Trial 052",
    "comparator": "052: continued BIC/FTC/TAF (double-blind); 051: continued baseline ART (open-label)",
    "efficacy": "HIV-1 RNA >=50 copies/mL at week 48: 1% vs 1% with BIC/FTC/TAF (052) and 1% vs 5% with baseline ART (051); <50 copies/mL 92% vs 94% (052) and 96% vs 92% (051)",
    "safety": "AE discontinuations 3% vs 2% (052) and 0.5% vs 2% (051); mean weight change -0.03 vs 0.28 kg (052); one case of severe immune thrombocytopenia",
    "source": "https://www.merck.com/news/fda-approves-mercks-once-daily-idvynso-doravirine-islatravir/",
    "source_label": "Merck FDA approval press release",
    "status_note": "FDA approved (April 2026)"
  },
  "yeztugo": {
    "route_frequency": "Subcutaneous injection every 6 months, after initiation (injection + oral tablets days 1-2)",
    "clinic_visits": "HCP-administered abdominal subcutaneous injection every 6 months",
    "food": "Not applicable (initiation tablets may be taken with or without food)",
    "population": "PURPOSE 1: cisgender adolescent girls and young women 16-25 in South Africa and Uganda; PURPOSE 2: cisgender men, transgender and gender-nonbinary people",
    "pivotal_trials": "PURPOSE 1, PURPOSE 2",
    "comparator": "Daily oral Truvada (FTC/TDF) in both trials; also daily Descovy in PURPOSE 1",
    "efficacy": "PURPOSE 1: 0 infections among 2,134 participants (0.00/100 PY) vs 16 with Truvada (1.69/100 PY); PURPOSE 2: 2 infections among 2,179 (0.10/100 PY) vs 9 with Truvada, an 89% lower risk",
    "safety": "Injection-site reactions 69% (PURPOSE 1) and 83% (PURPOSE 2) vs 35%/69% with placebo injections; injection-site nodules in ~63-64%; headache and nausea also common",
    "source": "https://www.gilead.com/-/media/files/pdfs/medicines/hiv/yeztugo/yeztugo_pi.pdf",
    "source_label": "FDA label (Gilead PI)",
    "status_note": "Approved (FDA)"
  },
  "apretude": {
    "route_frequency": "Intramuscular (gluteal) injection: 2 initiation injections 1 month apart, then every 2 months; optional 28-day oral lead-in",
    "clinic_visits": "HCP-administered, months 1 and 2, then every 2 months",
    "food": "Not applicable (food guidance for optional oral lead-in not verified)",
    "population": "HPTN 083: cisgender men and transgender women who have sex with men; HPTN 084: cisgender women in sub-Saharan Africa",
    "pivotal_trials": "HPTN 083, HPTN 084",
    "comparator": "Daily oral Truvada (FTC/TDF), double-blind",
    "efficacy": "HPTN 083: 12 vs 39 infections (0.37 vs 1.22/100 PY; HR 0.31, 69% risk reduction vs Truvada); HPTN 084: 4 vs 36 infections (0.20 vs 1.85/100 PY; HR 0.12)",
    "safety": "Injection-site reactions in 82% (HPTN 083) and 38% (HPTN 084); other common reactions were diarrhea, headache, pyrexia and fatigue",
    "source": "https://www.drugs.com/pro/apretude.html",
    "source_label": "FDA label (via Drugs.com)",
    "status_note": "Approved (FDA)",
    "additional_sources": [
      "https://pmc.ncbi.nlm.nih.gov/articles/9077443"
    ]
  },
  "descovy": {
    "route_frequency": "Oral, once daily",
    "clinic_visits": "Self-administered",
    "food": "With or without food",
    "population": "Adults/adolescents at risk of sexual HIV, excluding receptive vaginal sex; studied in MSM and transgender women",
    "pivotal_trials": "DISCOVER",
    "comparator": "Daily oral Truvada (FTC/TDF)",
    "efficacy": "7 vs 15 HIV-1 infections (0.16 vs 0.34 per 100 PY; rate ratio 0.468), non-inferior to Truvada",
    "safety": "Diarrhea 5% (vs 6%) and nausea 4% (vs 5%); bone density rose slightly vs declines on Truvada; fewer renal UPCR elevations (0.7% vs 1.5%)",
    "source": "https://www.gilead.com/-/media/files/pdfs/medicines/hiv/descovy/descovy_pi.pdf",
    "source_label": "FDA label (Gilead PI)",
    "status_note": "Approved (FDA) for PrEP"
  },
  "mk-8527": {
    "route_frequency": "Oral, once monthly",
    "clinic_visits": "Self-administered",
    "food": "Not verified",
    "population": "EXPrESSIVE-11: sexually active people who could benefit from PrEP (16 countries); EXPrESSIVE-10: women aged 16-30 in Kenya, South Africa and Uganda",
    "pivotal_trials": "EXPrESSIVE-10 (MK-8527-010, n=4,580), EXPrESSIVE-11 (MK-8527-011, n=4,390)",
    "comparator": "Daily oral FTC/TDF",
    "efficacy": "Not verified",
    "safety": "Phase 2 (MK-8527-007): AE rates similar to placebo; no clinically meaningful changes in lymphocyte or CD4 counts",
    "source": "https://www.biospace.com/press-releases/merck-to-initiate-phase-3-trials-for-investigational-once-monthly-hiv-prevention-pill",
    "source_label": "Merck press release, Jul 2025",
    "status_note": "Phase 3; not yet approved. Primary endpoint is HIV-1 incidence; no efficacy results"
  }
};
