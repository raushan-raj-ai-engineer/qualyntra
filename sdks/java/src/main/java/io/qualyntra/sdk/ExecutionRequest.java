/**
 * File: sdks/java/src/main/java/io/qualyntra/sdk/ExecutionRequest.java
 * Purpose: Defines a Java execution request model with immutable argument and metadata collections.
 * Author: Raushan Raj
 */
package io.qualyntra.sdk;
import java.util.List; import java.util.Map;
public record ExecutionRequest(String runId,String projectId,RuntimeIdentity runtime,List<String> args,Map<String,String> metadata) { public ExecutionRequest { if(runId==null||runId.isBlank())throw new IllegalArgumentException("runId is required"); if(projectId==null||projectId.isBlank())throw new IllegalArgumentException("projectId is required"); args=args==null?List.of():List.copyOf(args); metadata=metadata==null?Map.of():Map.copyOf(metadata); } }

