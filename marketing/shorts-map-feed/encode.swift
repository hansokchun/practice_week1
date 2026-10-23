import Foundation
import AVFoundation
import CoreGraphics
import CoreMedia
import CoreVideo
import ImageIO
import UniformTypeIdentifiers

struct VideoError: Error, CustomStringConvertible {
    let description: String
    init(_ description: String) { self.description = description }
}

func errorDetails(_ error: Error?) -> String {
    guard let error else { return "No underlying error" }
    let ns = error as NSError
    return "\(ns.domain) \(ns.code): \(ns.localizedDescription); \(ns.userInfo)"
}

func writeJSON(_ object: [String: Any]) throws {
    let data = try JSONSerialization.data(withJSONObject: object, options: [.prettyPrinted, .sortedKeys])
    print(String(decoding: data, as: UTF8.self))
}

func encode(_ args: [String]) throws {
    guard args.count >= 2 else { throw VideoError("encode requires frame directory and output MP4") }
    let frameDirectory = URL(fileURLWithPath: args[0], isDirectory: true)
    let output = URL(fileURLWithPath: args[1])
    let fps = args.count > 2 ? Int32(args[2]) ?? 60 : 60
    let width = args.count > 3 ? Int(args[3]) ?? 1080 : 1080
    let height = args.count > 4 ? Int(args[4]) ?? 1920 : 1920
    let bitrate = args.count > 5 ? Int(args[5]) ?? 18_000_000 : 18_000_000
    guard fps > 0 && width > 0 && height > 0 else { throw VideoError("Invalid output dimensions or frame rate") }
    guard !FileManager.default.fileExists(atPath: output.path) else { throw VideoError("Output already exists; choose a fresh path") }
    let frames = try FileManager.default.contentsOfDirectory(at: frameDirectory, includingPropertiesForKeys: nil)
        .filter { $0.pathExtension.lowercased() == "png" }
        .sorted { $0.lastPathComponent.localizedStandardCompare($1.lastPathComponent) == .orderedAscending }
    guard !frames.isEmpty else { throw VideoError("No PNG frames found") }

    let writer = try AVAssetWriter(outputURL: output, fileType: .mp4)
    writer.shouldOptimizeForNetworkUse = true
    let settings: [String: Any] = [
        AVVideoCodecKey: AVVideoCodecType.h264,
        AVVideoWidthKey: width,
        AVVideoHeightKey: height,
        AVVideoColorPropertiesKey: [
            AVVideoColorPrimariesKey: AVVideoColorPrimaries_ITU_R_709_2,
            AVVideoTransferFunctionKey: AVVideoTransferFunction_ITU_R_709_2,
            AVVideoYCbCrMatrixKey: AVVideoYCbCrMatrix_ITU_R_709_2
        ],
        AVVideoCompressionPropertiesKey: [
            AVVideoAverageBitRateKey: bitrate,
            AVVideoProfileLevelKey: AVVideoProfileLevelH264HighAutoLevel,
            AVVideoExpectedSourceFrameRateKey: fps,
            AVVideoMaxKeyFrameIntervalKey: fps,
            AVVideoAllowFrameReorderingKey: false
        ]
    ]
    let input = AVAssetWriterInput(mediaType: .video, outputSettings: settings)
    input.expectsMediaDataInRealTime = false
    let adaptor = AVAssetWriterInputPixelBufferAdaptor(assetWriterInput: input, sourcePixelBufferAttributes: [
        kCVPixelBufferPixelFormatTypeKey as String: kCVPixelFormatType_32BGRA,
        kCVPixelBufferWidthKey as String: width,
        kCVPixelBufferHeightKey as String: height,
        kCVPixelBufferCGImageCompatibilityKey as String: true,
        kCVPixelBufferCGBitmapContextCompatibilityKey as String: true,
        kCVPixelBufferIOSurfacePropertiesKey as String: [:]
    ])
    guard writer.canAdd(input) else { throw VideoError("H.264 input unsupported") }
    writer.add(input)
    guard writer.startWriting() else { throw VideoError("startWriting: \(errorDetails(writer.error))") }
    writer.startSession(atSourceTime: .zero)
    guard let pool = adaptor.pixelBufferPool else { throw VideoError("No pixel buffer pool") }
    let colorSpace = CGColorSpace(name: CGColorSpace.sRGB)!

    for (index, url) in frames.enumerated() {
        try autoreleasepool {
            guard let source = CGImageSourceCreateWithURL(url as CFURL, nil),
                  let image = CGImageSourceCreateImageAtIndex(source, 0, nil) else {
                throw VideoError("Cannot decode frame \(url.lastPathComponent)")
            }
            guard image.width == width && image.height == height else {
                throw VideoError("Wrong frame dimensions for \(url.lastPathComponent): \(image.width)x\(image.height)")
            }
            var maybeBuffer: CVPixelBuffer?
            guard CVPixelBufferPoolCreatePixelBuffer(kCFAllocatorDefault, pool, &maybeBuffer) == kCVReturnSuccess,
                  let buffer = maybeBuffer else { throw VideoError("Cannot allocate pixel buffer") }
            CVPixelBufferLockBaseAddress(buffer, [])
            defer { CVPixelBufferUnlockBaseAddress(buffer, []) }
            guard let base = CVPixelBufferGetBaseAddress(buffer),
                  let context = CGContext(data: base, width: width, height: height, bitsPerComponent: 8,
                    bytesPerRow: CVPixelBufferGetBytesPerRow(buffer), space: colorSpace,
                    bitmapInfo: CGBitmapInfo.byteOrder32Little.rawValue | CGImageAlphaInfo.premultipliedFirst.rawValue) else {
                throw VideoError("Cannot create frame rendering context")
            }
            context.setFillColor(CGColor(red: 1, green: 1, blue: 1, alpha: 1))
            context.fill(CGRect(x: 0, y: 0, width: width, height: height))
            context.draw(image, in: CGRect(x: 0, y: 0, width: width, height: height))
            let readyDeadline = Date().addingTimeInterval(30)
            while !input.isReadyForMoreMediaData {
                if writer.status == .failed || Date() > readyDeadline {
                    throw VideoError("waitUntilReady: \(errorDetails(writer.error))")
                }
                Thread.sleep(forTimeInterval: 0.002)
            }
            let time = CMTime(value: CMTimeValue(index), timescale: fps)
            guard adaptor.append(buffer, withPresentationTime: time) else {
                throw VideoError("append frame \(index): \(errorDetails(writer.error))")
            }
        }
    }
    writer.endSession(atSourceTime: CMTime(value: CMTimeValue(frames.count), timescale: fps))
    input.markAsFinished()
    let finished = DispatchSemaphore(value: 0)
    writer.finishWriting { finished.signal() }
    guard finished.wait(timeout: .now() + 60) == .success else { throw VideoError("Encoder finalize timed out") }
    guard writer.status == .completed else { throw VideoError(writer.error?.localizedDescription ?? "Encoder did not complete") }
    try writeJSON(["output": output.path, "framesSubmitted": frames.count, "fps": fps,
        "width": width, "height": height, "expectedDurationSeconds": Double(frames.count) / Double(fps),
        "requestedAverageBitrate": bitrate, "audioTracksCreated": 0])
}

func inspect(_ args: [String]) async throws {
    guard !args.isEmpty else { throw VideoError("inspect requires an MP4 path") }
    let input = URL(fileURLWithPath: args[0])
    let asset = AVURLAsset(url: input)
    let videoTracks = try await asset.loadTracks(withMediaType: .video)
    let audioTracks = try await asset.loadTracks(withMediaType: .audio)
    guard let track = videoTracks.first else { throw VideoError("No video track") }
    let duration = try await asset.load(.duration)
    let size = try await track.load(.naturalSize)
    let frameRate = try await track.load(.nominalFrameRate)
    let transform = try await track.load(.preferredTransform)
    let descriptions = try await track.load(.formatDescriptions)
    let codec = descriptions.first.map { CMFormatDescriptionGetMediaSubType($0) } ?? 0
    let codecName = [24, 16, 8, 0].map { String(UnicodeScalar((codec >> $0) & 0xff)!) }.joined()
    let reader = try AVAssetReader(asset: asset)
    let decoded = AVAssetReaderTrackOutput(track: track,
        outputSettings: [kCVPixelBufferPixelFormatTypeKey as String: kCVPixelFormatType_32BGRA])
    decoded.alwaysCopiesSampleData = false
    guard reader.canAdd(decoded) else { throw VideoError("Cannot read video track") }
    reader.add(decoded)
    guard reader.startReading() else { throw VideoError(reader.error?.localizedDescription ?? "Cannot decode video") }
    var count = 0
    var firstTime: Double?
    var lastTime: Double?
    while true {
        let nextTime: Double? = autoreleasepool {
            guard let sample = decoded.copyNextSampleBuffer() else { return nil }
            count += CMSampleBufferGetNumSamples(sample)
            return CMSampleBufferGetPresentationTimeStamp(sample).seconds
        }
        guard let time = nextTime else { break }
        if firstTime == nil { firstTime = time }
        lastTime = time
    }
    guard reader.status == .completed else { throw VideoError(reader.error?.localizedDescription ?? "Video decode incomplete") }
    if args.count > 1 {
        let directory = URL(fileURLWithPath: args[1], isDirectory: true)
        try FileManager.default.createDirectory(at: directory, withIntermediateDirectories: true)
        let generator = AVAssetImageGenerator(asset: asset)
        generator.appliesPreferredTrackTransform = true
        generator.requestedTimeToleranceBefore = .zero
        generator.requestedTimeToleranceAfter = .zero
        for seconds in [0.0, 0.4, 0.9, 1.4, 1.85, 2.25, 2.7, 3.05, 3.5, 3.95] where seconds < duration.seconds {
            let time = CMTime(seconds: seconds, preferredTimescale: 60000)
            let result = try await generator.image(at: time)
            let output = directory.appendingPathComponent(String(format: "sample-%04d.png", Int(seconds * 1000)))
            guard let destination = CGImageDestinationCreateWithURL(output as CFURL, UTType.png.identifier as CFString, 1, nil) else {
                throw VideoError("Cannot write inspection image")
            }
            CGImageDestinationAddImage(destination, result.image, nil)
            guard CGImageDestinationFinalize(destination) else { throw VideoError("Cannot finalize inspection image") }
        }
    }
    try writeJSON(["input": input.path, "codec": codecName, "durationSeconds": duration.seconds,
        "width": size.width, "height": size.height, "nominalFPS": frameRate,
        "decodedFrames": count, "firstFrameSeconds": firstTime ?? -1, "lastFrameSeconds": lastTime ?? -1,
        "audioTrackCount": audioTracks.count, "videoTrackCount": videoTracks.count,
        "preferredTransform": [transform.a, transform.b, transform.c, transform.d, transform.tx, transform.ty],
        "allFramesDecoded": true])
}

@main struct Main {
    static func main() async {
        let args = Array(CommandLine.arguments.dropFirst())
        do {
            guard let command = args.first else { throw VideoError("Usage: encode-video encode <frames-dir> <output.mp4> [fps] [width] [height] [bitrate] | inspect <video.mp4> [sample-png-directory]") }
            if command == "encode" { try encode(Array(args.dropFirst())) }
            else if command == "inspect" { try await inspect(Array(args.dropFirst())) }
            else { throw VideoError("Unknown command") }
        } catch {
            FileHandle.standardError.write(Data("Error: \(error)\n".utf8))
            exit(1)
        }
    }
}
