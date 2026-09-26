/**
 * THE IDEOVENT MARKER, IN BOTH LANGUAGES.
 *
 * The ribbon above the institute's masthead and the credit block at the foot
 * of the page are Ideovent speaking rather than the institute, and they sit
 * outside the institute's palette on purpose. They still follow the reader's
 * language, for one plain reason: a director who has just switched the whole
 * page to Hindi and finds the one line above the masthead still in English
 * reads that as the translation having run out, which is the exact impression
 * this feature exists to avoid.
 *
 * The register is Mehdi's own. The WhatsApp opener this marker generates has
 * always been Hinglish ("Aapne jo website banayi hai wo dekhi"), so the Hindi
 * column here is not a new voice, it is the voice the rest of the marker was
 * already written in.
 */

import type { DemoLang } from "../language";

export interface MarkerCopy {
  ribbonBefore: string;
  ribbonBuiltBy: string;
  ribbonFor: string;
  ribbonAfter: string;
  ribbonLink: string;
  /**
   * The clause that FOLDS THE SECOND BAR INTO THE FIRST.
   *
   * The old build stacked a second full-width strip under the marker saying
   * that this was an example record, which cost roughly ninety pixels of our
   * own chrome above the institute's masthead and pushed their site below the
   * fold on a phone. It is one clause now, appended to the marker sentence on
   * the example records only, and the separate bar is gone.
   */
  exampleClause: string;

  eyebrow: string;
  titleBefore: string;
  titleFirm: string;
  titleFor: (institute: string) => string;
  body: (institute: string) => string;
  officialLead: string;
  talkToMehdi: string;
  seeMore: string;

  /** Prefilled into WhatsApp when the director presses the button. */
  openerFor: (institute: string, place: string) => string;
}

export function markerCopy(lang: DemoLang): MarkerCopy {
  if (lang === "hi") {
    return {
      /* "demo", not "demonstration": the English word a Delhi reader actually
         uses. "demonstration" in Hindi running text reads as a translation. */
      ribbonBefore: "यह एक demo website है, जिसे ",
      ribbonBuiltBy: "Ideovent Technologies",
      ribbonFor: " ने ",
      ribbonAfter: " के लिए बनाया है। यह उनकी live site नहीं है।",
      ribbonLink: "किसने बनाई",
      exampleClause: "नीचे लिखा हर नाम, आँकड़ा और तारीख़ उदाहरण है।",

      eyebrow: "इस website के बारे में",
      titleBefore: "यह site ",
      titleFirm: "Ideovent Technologies",
      titleFor: (institute) => ` ने ${institute} के लिए demo के तौर पर बनाई है।`,
      body: (institute) =>
        `यह एक working demo है, ${institute} की live website नहीं। हर page असली है और उस पर सब कुछ बदला, जोड़ा या हटाया जा सकता है। यहाँ कुछ भी institute ने ख़ुद publish नहीं किया, और जिस हिस्से में अब भी placeholder दिख रहा है, वह उनके अपने शब्दों का इंतज़ार कर रहा है।`,
      officialLead: "उनकी असली website है ",
      talkToMehdi: "Mehdi से WhatsApp पर बात कीजिए",
      seeMore: "हम और क्या बनाते हैं, देखिए",

      openerFor: (institute, place) =>
        `नमस्ते Ideovent team। ${institute}${place}। आपने जो website बनाई है वह देखी। इसके बारे में बात करनी है।`,
    };
  }

  return {
    ribbonBefore: "A demonstration website, built by ",
    ribbonBuiltBy: "Ideovent Technologies",
    ribbonFor: " for ",
    ribbonAfter: ". Not their live site.",
    ribbonLink: "Who made this",
    exampleClause: "Every name, number and date below is example content.",

    eyebrow: "About this website",
    titleBefore: "This site was built by ",
    titleFirm: "Ideovent Technologies",
    titleFor: (institute) => ` as a demonstration for ${institute}.`,
    body: (institute) =>
      `It is a working example, not ${institute}’s live website. Every page is real and everything on it can be changed, added to or removed. Nothing here was published by the institute, and any section still showing a placeholder is waiting for their own words.`,
    officialLead: "Their actual website is ",
    talkToMehdi: "Talk to Mehdi on WhatsApp",
    seeMore: "See what else we build",

    openerFor: (institute, place) =>
      `Namaste Ideovent team. ${institute}${place}. Aapne jo website banayi hai wo dekhi. Iske baare mein baat karni hai.`,
  };
}
