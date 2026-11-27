// The Hikmah logo from the brand kit (version 1.0). The files are outlined
// vectors and are used exactly as supplied: never retyped in a font, recoloured,
// rotated, mirrored or given effects. Arabic pages use the primary lockup with the
// board on the right; English pages use the Latin-first lockup. On Night Ink the
// kit's white lockup is shown.
export function BrandLogo({arabic}:{arabic:boolean}){
  const lockup='/brand/hikmah_lockup-mark-'+(arabic?'right':'left');
  return <>
    {/* eslint-disable-next-line @next/next/no-img-element */}
    <img className="brand-logo on-light" src={lockup+'_color.svg'} width={586} height={184} alt="Hikmah | حكمة"/>
    {/* eslint-disable-next-line @next/next/no-img-element */}
    <img className="brand-logo on-dark" src={lockup+'_white.svg'} width={586} height={184} alt="" aria-hidden="true"/>
  </>;
}
