package com.example.ss.controller;

import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.HashMap;
import java.util.Map;

/**
 * API疎通テスト用コントローラー
 * Frontend-Backend間の接続確認に使用
 */
@RestController
@RequestMapping("/api")
public class TestController {

    /**
     * JSONレスポンスのテスト
     * @return メッセージとステータスを含むMap
     */
    @GetMapping("/hello")
    public Map<String, String> hello() {
        Map<String, String> response = new HashMap<>();
        response.put("message", "Hello from Spring Boot!");
        response.put("status", "success");
        return response;
    }

    /**
     * シンプルな疎通確認
     * @return pong文字列
     */
    @GetMapping("/ping")
    public String ping() {
        return "pong";
    }
}
