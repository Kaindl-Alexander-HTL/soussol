import { ImageResponse } from 'next/og'

export const size = { width: 32, height: 32 }
export const contentType = 'image/png'

export default async function Icon() {
  const font = await fetch(
    'https://fonts.gstatic.com/s/cormorantgaramond/v21/co3smX5slCNuHLi8bLeY9MK7whWMhyjYrGFEsdtdc62E6zd58jDOjw.ttf'
  ).then((res) => res.arrayBuffer())

  return new ImageResponse(
    (
      <div
        style={{
          background: '#0A0A0A',
          width: '100%',
          height: '100%',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        <span
          style={{
            fontFamily: 'Cormorant Garamond',
            fontStyle: 'italic',
            fontSize: 24,
            color: '#F2EDE3',
            lineHeight: 1,
            marginTop: 2,
          }}
        >
          S
        </span>
      </div>
    ),
    {
      ...size,
      fonts: [{ name: 'Cormorant Garamond', data: font, style: 'italic', weight: 400 }],
    }
  )
}
