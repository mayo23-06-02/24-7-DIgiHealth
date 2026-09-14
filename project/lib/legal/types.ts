export type LegalBodyBlock =
  | { type: "p"; text: string }
  | { type: "ul"; items: string[] };

export interface LegalSection {
  heading: string;
  body: LegalBodyBlock[];
}

export interface LegalDoc {
  title: string;
  intro: string[];
  sections: LegalSection[];
}
