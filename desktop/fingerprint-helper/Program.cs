using System.Text.Json;

// JSON-lines bridge between Electron main and the DigitalPersona One Touch SDK.
//   stdin : {"cmd":"status"} {"cmd":"enroll"} {"cmd":"verify","templates":[{"userId":"..","template":"<b64>"}]} {"cmd":"cancel"}
//   stdout: {"event":"reader","connected":true} {"event":"sample","quality":"good"}
//           {"event":"enrolled","template":"<b64>"} {"event":"match","userId":".."}
//           {"event":"no-match"} {"event":"error","message":".."}
//
// Built without the SDK assemblies (see .csproj), this becomes a stub that
// reports the reader as unavailable, so CI and Linux dev builds stay green.

namespace FingerprintHelper;

internal static class Program
{
    private static readonly object StdoutLock = new();

    internal static void Emit(object payload)
    {
        lock (StdoutLock)
        {
            Console.WriteLine(JsonSerializer.Serialize(payload));
            Console.Out.Flush();
        }
    }

    private static void Main()
    {
#if FINGERPRINT_STUB
        IFingerprintEngine engine = new StubEngine();
#else
        IFingerprintEngine engine = new DigitalPersonaEngine();
#endif
        engine.Start();

        string? line;
        while ((line = Console.ReadLine()) != null)
        {
            try
            {
                using var doc = JsonDocument.Parse(line);
                var cmd = doc.RootElement.GetProperty("cmd").GetString();
                switch (cmd)
                {
                    case "status":
                        engine.ReportStatus();
                        break;
                    case "enroll":
                        engine.BeginEnroll();
                        break;
                    case "verify":
                        var templates = new List<(string UserId, string Template)>();
                        if (doc.RootElement.TryGetProperty("templates", out var arr))
                        {
                            foreach (var item in arr.EnumerateArray())
                            {
                                var userId = item.GetProperty("userId").GetString() ?? "";
                                var template = item.GetProperty("template").GetString() ?? "";
                                templates.Add((userId, template));
                            }
                        }
                        engine.BeginVerify(templates);
                        break;
                    case "cancel":
                        engine.Cancel();
                        break;
                }
            }
            catch (Exception ex)
            {
                Emit(new { @event = "error", message = ex.Message });
            }
        }
        engine.Stop();
    }
}

internal interface IFingerprintEngine
{
    void Start();
    void Stop();
    void ReportStatus();
    void BeginEnroll();
    void BeginVerify(List<(string UserId, string Template)> templates);
    void Cancel();
}

internal sealed class StubEngine : IFingerprintEngine
{
    public void Start() => Program.Emit(new { @event = "reader", connected = false });
    public void Stop() { }
    public void ReportStatus() => Program.Emit(new { @event = "reader", connected = false });
    public void BeginEnroll() => Program.Emit(new { @event = "error", message = "Fingerprint SDK not bundled in this build." });
    public void BeginVerify(List<(string UserId, string Template)> templates) =>
        Program.Emit(new { @event = "error", message = "Fingerprint SDK not bundled in this build." });
    public void Cancel() { }
}

#if !FINGERPRINT_STUB
// Real implementation against DigitalPersona One Touch for Windows .NET SDK.
internal sealed class DigitalPersonaEngine : IFingerprintEngine, DPFP.Capture.EventHandler
{
    private DPFP.Capture.Capture? _capture;
    private DPFP.Processing.Enrollment? _enrollment;
    private List<(string UserId, DPFP.Template Template)>? _verifySet;
    private readonly DPFP.Verification.Verification _verificator = new();

    public void Start()
    {
        _capture = new DPFP.Capture.Capture();
        _capture.EventHandler = this;
        _capture.StartCapture();
        Program.Emit(new { @event = "reader", connected = true });
    }

    public void Stop()
    {
        _capture?.StopCapture();
        _capture = null;
    }

    public void ReportStatus() =>
        Program.Emit(new { @event = "reader", connected = _capture != null });

    public void BeginEnroll()
    {
        _verifySet = null;
        _enrollment = new DPFP.Processing.Enrollment();
    }

    public void BeginVerify(List<(string UserId, string Template)> templates)
    {
        _enrollment = null;
        _verifySet = templates.Select(t =>
        {
            var template = new DPFP.Template();
            template.DeSerialize(Convert.FromBase64String(t.Template));
            return (t.UserId, template);
        }).ToList();
    }

    public void Cancel()
    {
        _enrollment = null;
        _verifySet = null;
    }

    // DPFP.Capture.EventHandler
    public void OnComplete(object capture, string readerSerialNumber, DPFP.Sample sample)
    {
        Program.Emit(new { @event = "sample", quality = "good" });
        if (_enrollment != null) ProcessEnroll(sample);
        else if (_verifySet != null) ProcessVerify(sample);
    }

    public void OnFingerGone(object capture, string readerSerialNumber) { }
    public void OnFingerTouch(object capture, string readerSerialNumber) { }
    public void OnReaderConnect(object capture, string readerSerialNumber) =>
        Program.Emit(new { @event = "reader", connected = true });
    public void OnReaderDisconnect(object capture, string readerSerialNumber) =>
        Program.Emit(new { @event = "reader", connected = false });
    public void OnSampleQuality(object capture, string readerSerialNumber, DPFP.Capture.CaptureFeedback feedback)
    {
        if (feedback != DPFP.Capture.CaptureFeedback.Good)
            Program.Emit(new { @event = "sample", quality = "poor" });
    }

    private static DPFP.FeatureSet? ExtractFeatures(DPFP.Sample sample, DPFP.Processing.DataPurpose purpose)
    {
        var extractor = new DPFP.Processing.FeatureExtraction();
        var feedback = DPFP.Capture.CaptureFeedback.None;
        var features = new DPFP.FeatureSet();
        extractor.CreateFeatureSet(sample, purpose, ref feedback, ref features);
        return feedback == DPFP.Capture.CaptureFeedback.Good ? features : null;
    }

    private void ProcessEnroll(DPFP.Sample sample)
    {
        var features = ExtractFeatures(sample, DPFP.Processing.DataPurpose.Enrollment);
        if (features == null || _enrollment == null) return;
        _enrollment.AddFeatures(features);
        if (_enrollment.TemplateStatus == DPFP.Processing.Enrollment.Status.Ready)
        {
            var bytes = new byte[0];
            _enrollment.Template.Serialize(ref bytes);
            Program.Emit(new { @event = "enrolled", template = Convert.ToBase64String(bytes) });
            _enrollment = null;
        }
        else if (_enrollment.TemplateStatus == DPFP.Processing.Enrollment.Status.Failed)
        {
            Program.Emit(new { @event = "error", message = "Enrollment failed — try again." });
            _enrollment = new DPFP.Processing.Enrollment();
        }
    }

    private void ProcessVerify(DPFP.Sample sample)
    {
        var features = ExtractFeatures(sample, DPFP.Processing.DataPurpose.Verification);
        if (features == null || _verifySet == null) return;
        foreach (var (userId, template) in _verifySet)
        {
            var result = new DPFP.Verification.Verification.Result();
            _verificator.Verify(features, template, ref result);
            if (result.Verified)
            {
                Program.Emit(new { @event = "match", userId });
                return;
            }
        }
        Program.Emit(new { @event = "no-match" });
    }
}
#endif
