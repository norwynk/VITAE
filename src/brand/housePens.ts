/**
 * PRICK pens for public pages: the real pen, in brand colours, with no
 * product on the label. Which pen someone gets is their clinician's call.
 */
import { type Botanical, type PenColours, coloursFor } from './colours';

export interface HousePen {
  slug: string;
  penLabel: string;
  colours: PenColours;
  botanical: Botanical;
}

const pen = (slug: string, hex: string, botanical: Botanical): HousePen => ({ slug, penLabel: 'Your protocol', colours: coloursFor(hex), botanical });

export const HOUSE_PENS: HousePen[] = [
  pen('pink', '#FF0F78', 'blossom'),
  pen('orange', '#FF6A21', 'citrus'),
  pen('blue', '#1267E8', 'lavender'),
  pen('lime', '#7DBA2F', 'leaf'),
  pen('berry', '#8E1F5D', 'berry'),
  pen('sky', '#3FA9F5', 'daisy'),
];

export const MEN_HOUSE_PENS: HousePen[] = [
  pen('electric', '#1F6FFF', 'leaf'),
  pen('steel', '#2B4C7E', 'leaf'),
  pen('navy', '#14365F', 'leaf'),
  pen('graphite', '#2B2F36', 'leaf'),
  pen('cobalt', '#3A7BD5', 'leaf'),
  pen('midnight', '#22324A', 'leaf'),
];
