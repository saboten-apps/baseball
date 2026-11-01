// Remotion Studio（npm run studio）用の設定。レンダリング本番は scripts/renderWeek.ts が API で行う。
import { Config } from '@remotion/cli/config'

Config.setVideoImageFormat('jpeg')
Config.setPixelFormat('yuv420p')
Config.setCodec('h264')
if (process.env.REMOTION_BROWSER_EXECUTABLE) Config.setBrowserExecutable(process.env.REMOTION_BROWSER_EXECUTABLE)
