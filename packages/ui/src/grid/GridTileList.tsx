import { View, SizableText, styled } from 'tamagui'

export const GridTileList = styled(
  ({ title }: { title: string }) => (
    <View
      style={{ flex: 1, aspectRatio: 1, justifyContent: 'start' }}
      borderColor="black"
      borderWidth="$1"
      borderRadius="$4"
    >
      <SizableText style={{ fontSize: 12, lineHeight: 14, fontWeight: 700 }} ta="left" m="$2">{title}</SizableText>
    </View>
  ),
  {
    name: 'GridTileList',
    // variants: {
    //   blue: {
    //     true: {
    //       backgroundColor: 'blue',
    //     },
    //   },
    // } as const,
  }
)
