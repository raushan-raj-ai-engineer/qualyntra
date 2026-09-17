// File: sdks/dotnet/src/Qualyntra.Sdk/Contracts.cs
// Purpose: Defines .NET records for NUnit/xUnit/MSTest, Selenium, Playwright, Appium, and custom adapters.
// Author: Raushan Raj

namespace Qualyntra.Sdk;
public sealed record RuntimeIdentity(string Language,string Runner,string? Engine=null,string? RunnerVersion=null,string? EngineVersion=null);
public sealed record ExecutionRequest(string RunId,string ProjectId,RuntimeIdentity Runtime,IReadOnlyList<string>? Args=null,IReadOnlyDictionary<string,string>? Metadata=null);
public sealed record EvaluationCase(string Id,string Input,string ActualOutput,string? ExpectedOutput=null,IReadOnlyList<string>? Context=null,IReadOnlyList<string>? RetrievalContext=null);
