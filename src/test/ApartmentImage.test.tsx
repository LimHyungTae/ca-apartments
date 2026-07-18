import { fireEvent, render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'

import { ApartmentImage } from '../components/ApartmentImage'

describe('ApartmentImage', () => {
  it('shows a useful placeholder when no photo is available', () => {
    render(<ApartmentImage alt="Park Place" />)

    expect(screen.getByRole('img', { name: 'Park Place 사진 없음' })).toHaveTextContent(
      '사진 준비 중',
    )
  })

  it('falls back to the placeholder when an image cannot be loaded', () => {
    render(<ApartmentImage alt="Park Place 거실" src="/missing.webp" />)

    fireEvent.error(screen.getByRole('img', { name: 'Park Place 거실' }))

    expect(screen.getByRole('img', { name: 'Park Place 거실 사진 없음' })).toBeInTheDocument()
  })

  it('tries again when the selected image source changes', () => {
    const { rerender } = render(<ApartmentImage alt="거실" src="/broken.webp" />)
    fireEvent.error(screen.getByRole('img', { name: '거실' }))

    rerender(<ApartmentImage alt="주방" src="/working.webp" />)

    expect(screen.getByRole('img', { name: '주방' })).toHaveAttribute('src', '/working.webp')
  })
})
