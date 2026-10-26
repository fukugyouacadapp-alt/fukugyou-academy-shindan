import { getImageProps } from 'next/image'
import { preload } from 'react-dom'
import logo from '@/assets/fukugyou-academy-logo.png'

/** 読み解き中の画面で揺らすロゴ（元の画像は 1400×938）。先読みと表示で同じ画像を引くよう、大きさはここだけで決める */
export const READING_LOGO = { src: logo, width: 132, height: 88 } as const

/**
 * 読み解き中の画面のロゴを、診断に答えている間に読んでおく。
 * その画面は約2.4秒しか出ないので、出てから読み始めると、ロゴが出る前に結果へ切り替わることがある
 */
export function preloadReadingLogo() {
  const { props } = getImageProps({ ...READING_LOGO, alt: '' })
  preload(props.src, { as: 'image', imageSrcSet: props.srcSet, fetchPriority: 'low' })
}
