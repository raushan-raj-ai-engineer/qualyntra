/**
 * File: sdks/java/src/test/java/io/qualyntra/sdk/ContractSmoke.java
 * Purpose: Provides a dependency-free Java SDK compile/runtime smoke test.
 * Author: Raushan Raj
 */
package io.qualyntra.sdk;
import java.util.List; import java.util.Map;
public final class ContractSmoke { public static void main(String[] args){ var runtime=new RuntimeIdentity("java","junit","selenium",null,null); var request=new ExecutionRequest("run-1","demo",runtime,List.of("--smoke"),Map.of()); if(!request.runtime().language().equals("java")) throw new IllegalStateException("contract failure"); System.out.println("Java SDK smoke passed"); } }

