// The Hikmah logo from the brand kit (version 1.0). The files are outlined
// vectors and are used exactly as supplied: never retyped in a font, recoloured,
// rotated, mirrored or given effects. Arabic pages use the primary lockup with the
// board on the right; English pages use the Latin-first lockup. On Night Ink the
// board keeps its colours and only the two names switch from Night Ink to Day
// Paper: the _night files are the colour lockups with that single fill changed.
export function BrandLogo({arabic}:{arabic:boolean}){
  const lockup='/brand/hikmah_lockup-mark-'+(arabic?'right':'left');
  return <>
    {/* eslint-disable-next-line @next/next/no-img-element */}
    <img className="brand-logo on-light" src={lockup+'_color.svg'} width={586} height={184} alt="Hikmah | حكمة"/>
    {/* eslint-disable-next-line @next/next/no-img-element */}
    <img className="brand-logo on-dark" src={lockup+'_night.svg'} width={586} height={184} alt="" aria-hidden="true"/>
  </>;
}
