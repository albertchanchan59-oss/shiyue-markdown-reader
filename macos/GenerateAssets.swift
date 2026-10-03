import AppKit

let destination = CommandLine.arguments[1]
let manager = FileManager.default
try manager.createDirectory(atPath: destination + "/AppIcon.iconset", withIntermediateDirectories: true)
let olive = NSColor(srgbRed: 89/255, green: 100/255, blue: 73/255, alpha: 1)
func png(_ size: Int, drawing: (CGFloat) -> Void) -> Data {
    let rep = NSBitmapImageRep(bitmapDataPlanes: nil, pixelsWide: size, pixelsHigh: size, bitsPerSample: 8, samplesPerPixel: 4, hasAlpha: true, isPlanar: false, colorSpaceName: .deviceRGB, bytesPerRow: 0, bitsPerPixel: 0)!
    let context = NSGraphicsContext(bitmapImageRep: rep)!
    NSGraphicsContext.saveGraphicsState(); NSGraphicsContext.current = context
    context.cgContext.scaleBy(x: CGFloat(size) / 1024, y: CGFloat(size) / 1024)
    drawing(1024)
    NSGraphicsContext.restoreGraphicsState()
    return rep.representation(using: .png, properties: [:])!
}
func bookIcon(_ size: CGFloat) {
    olive.setFill()
    NSBezierPath(roundedRect: NSRect(x: 60, y: 60, width: 904, height: 904), xRadius: 198, yRadius: 198).fill()
    NSColor.white.setStroke()
    let book = NSBezierPath(); book.lineWidth = 34; book.lineCapStyle = .round; book.lineJoinStyle = .round
    book.move(to: NSPoint(x: 225, y: 702)); book.curve(to: NSPoint(x: 512, y: 671), controlPoint1: NSPoint(x: 316, y: 732), controlPoint2: NSPoint(x: 423, y: 722))
    book.curve(to: NSPoint(x: 799, y: 702), controlPoint1: NSPoint(x: 601, y: 722), controlPoint2: NSPoint(x: 708, y: 732))
    book.line(to: NSPoint(x: 799, y: 340)); book.curve(to: NSPoint(x: 512, y: 309), controlPoint1: NSPoint(x: 708, y: 370), controlPoint2: NSPoint(x: 601, y: 360))
    book.curve(to: NSPoint(x: 225, y: 340), controlPoint1: NSPoint(x: 423, y: 360), controlPoint2: NSPoint(x: 316, y: 370)); book.close(); book.stroke()
    let spine = NSBezierPath(); spine.lineWidth = 30; spine.lineCapStyle = .round; spine.move(to: NSPoint(x: 512, y: 665)); spine.line(to: NSPoint(x: 512, y: 316)); spine.stroke()
    NSColor(white: 1, alpha: 0.52).setStroke()
    for y in [CGFloat(593), 519] { let line = NSBezierPath(); line.lineWidth = 16; line.lineCapStyle = .round; line.move(to: NSPoint(x: 292, y: y)); line.curve(to: NSPoint(x: 434, y: y - 8), controlPoint1: NSPoint(x: 343, y: y + 9), controlPoint2: NSPoint(x: 397, y: y + 2)); line.stroke() }
}
let iconSizes: [(String, Int)] = [("icon_16x16.png",16),("icon_16x16@2x.png",32),("icon_32x32.png",32),("icon_32x32@2x.png",64),("icon_128x128.png",128),("icon_128x128@2x.png",256),("icon_256x256.png",256),("icon_256x256@2x.png",512),("icon_512x512.png",512),("icon_512x512@2x.png",1024)]
for (filename, size) in iconSizes { try png(size, drawing: bookIcon).write(to: URL(fileURLWithPath: destination + "/AppIcon.iconset/" + filename)) }
try png(1024, drawing: bookIcon).write(to: URL(fileURLWithPath: destination + "/app-icon.png"))
let background = NSBitmapImageRep(bitmapDataPlanes: nil, pixelsWide: 1280, pixelsHigh: 1120, bitsPerSample: 8, samplesPerPixel: 4, hasAlpha: true, isPlanar: false, colorSpaceName: .deviceRGB, bytesPerRow: 0, bitsPerPixel: 0)!
NSGraphicsContext.saveGraphicsState(); let context = NSGraphicsContext(bitmapImageRep: background)!; NSGraphicsContext.current = context; context.cgContext.scaleBy(x: 2, y: 2)
NSColor(srgbRed: 246/255, green: 245/255, blue: 241/255, alpha: 1).setFill(); NSRect(x: 0, y: 0, width: 640, height: 560).fill()
func centered(_ text: String, y: CGFloat, font: NSFont, color: NSColor) { let string = NSAttributedString(string: text, attributes: [.font: font, .foregroundColor: color]); let size = string.size(); string.draw(at: NSPoint(x: (640 - size.width)/2, y: y)) }
centered("拾页 · Markdown 阅读器", y: 469, font: .systemFont(ofSize: 28, weight: .semibold), color: NSColor(srgbRed: 37/255, green: 41/255, blue: 35/255, alpha: 1))
centered("将拾页拖入右侧「应用程序」", y: 435, font: .systemFont(ofSize: 16), color: NSColor(white: 0.45, alpha: 1))
olive.withAlphaComponent(0.65).setStroke(); let arrow = NSBezierPath(); arrow.lineWidth = 5; arrow.lineCapStyle = .round; arrow.lineJoinStyle = .round; arrow.move(to: NSPoint(x: 285, y: 340)); arrow.line(to: NSPoint(x: 355, y: 340)); arrow.move(to: NSPoint(x: 337, y: 358)); arrow.line(to: NSPoint(x: 355, y: 340)); arrow.line(to: NSPoint(x: 337, y: 322)); arrow.stroke()
NSGraphicsContext.restoreGraphicsState()
try background.representation(using: .png, properties: [:])!.write(to: URL(fileURLWithPath: destination + "/installer-background@2x.png"))
