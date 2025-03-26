import { Heading } from './typo/Heading'
import { View } from 'react-native'
import { ExampleGrid } from './grid/ExampleGrid'
import { DetailsDemo } from './display/DetailsDemo'
import { SearchDemo } from './display/SearchDemo'
import { s } from '@/features/style'

const OnboardingCarouselHeading = ({ index }: { index: number }) => {
  if (index === 0)
    return (
      <Heading tag="h2" style={{ textAlign: 'center' }}>
        This is a grid.{'\n'} {'\n'}{' '}
        <Heading tag="h2normal">
          A mural that makes you, <Heading tag="h2normalitalic">you</Heading>
        </Heading>
      </Heading>
    )
  if (index === 1)
    return (
      <Heading tag="h2normal" style={{ textAlign: 'center' }}>
        <Heading tag="h2">Fill your grid</Heading> with links, photos, hobbies, places.
      </Heading>
    )
  else {
    return (
      <Heading tag="h2normal" style={{ textAlign: 'center' }}>
        ...then <Heading tag="h2">find people</Heading> based on the{'\n'}refs they add
      </Heading>
    )
  }
}

const OnboardingCarouselContent = ({ index }: { index: number }) => {
  if (index === 0) return <ExampleGrid />
  if (index === 1) return <DetailsDemo />
  if (index === 2) return <SearchDemo />
}

export const OnboardingCarouselItem = ({ index }: { index: number }) => {
  return (
    <>
      <View
        style={{
          justifyContent: 'flex-end',
          paddingTop: s.$8,
          paddingBottom: s.$4,
        }}
      >
        <OnboardingCarouselHeading index={index} />
      </View>
      <View style={{ flexGrow: 1 }}>
        <OnboardingCarouselContent index={index} />
      </View>
    </>
  )
}
