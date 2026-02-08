package auth

import (
	"crypto/hmac"
	"crypto/sha256"
	"encoding/hex"
	"fmt"
	"strings"
	"time"
)

const (
	// APIKeyPrefix is the expected prefix for all API keys
	APIKeyPrefix = "ask_"

	// MinAPIKeyLength is the minimum length for a valid API key
	MinAPIKeyLength = 20

	// APIKeyLength is the standard length for generated API keys
	APIKeyLength = 40
)

// APIKey represents an API key with metadata
type APIKey struct {
	Key       string
	ProjectID string
	CreatedAt time.Time
	ExpiresAt *time.Time
}

// Validator provides API key validation functionality
type Validator struct {
	// In a real implementation, this might connect to the server
	// to validate keys, or have a local cache
}

// NewValidator creates a new API key validator
func NewValidator() *Validator {
	return &Validator{}
}

// ValidateFormat checks if an API key has the correct format
func (v *Validator) ValidateFormat(apiKey string) error {
	if apiKey == "" {
		return fmt.Errorf("API key is empty")
	}

	if !strings.HasPrefix(apiKey, APIKeyPrefix) {
		return fmt.Errorf("API key must start with '%s'", APIKeyPrefix)
	}

	if len(apiKey) < MinAPIKeyLength {
		return fmt.Errorf("API key too short (minimum %d characters)", MinAPIKeyLength)
	}

	// Check for valid characters (alphanumeric and underscore)
	for _, char := range apiKey {
		if !isValidAPIKeyChar(char) {
			return fmt.Errorf("API key contains invalid characters")
		}
	}

	return nil
}

// isValidAPIKeyChar checks if a character is valid in an API key
func isValidAPIKeyChar(char rune) bool {
	return (char >= 'a' && char <= 'z') ||
		(char >= 'A' && char <= 'Z') ||
		(char >= '0' && char <= '9') ||
		char == '_'
}

// GenerateAPIKey generates a new API key for a project
// This is typically done server-side, but provided here for reference
func GenerateAPIKey(projectID string, secret []byte) (string, error) {
	if projectID == "" {
		return "", fmt.Errorf("project ID is required")
	}

	// Create HMAC-SHA256 hash of project ID + timestamp
	timestamp := time.Now().Unix()
	data := fmt.Sprintf("%s:%d", projectID, timestamp)

	h := hmac.New(sha256.New, secret)
	h.Write([]byte(data))
	hash := h.Sum(nil)

	// Encode as hex and truncate to desired length
	encoded := hex.EncodeToString(hash)
	keyPart := encoded[:APIKeyLength-len(APIKeyPrefix)]

	return APIKeyPrefix + keyPart, nil
}

// ExtractProjectID attempts to extract project information from an API key
// Note: In a real implementation, this would query the server
func (v *Validator) ExtractProjectID(apiKey string) (string, error) {
	if err := v.ValidateFormat(apiKey); err != nil {
		return "", err
	}

	// In a real implementation, this would:
	// 1. Query the server with the API key
	// 2. Return the associated project ID
	// 3. Cache the result for performance

	// For now, we just validate format
	return "", fmt.Errorf("project ID extraction requires server connection")
}

// IsExpired checks if an API key is expired
func (k *APIKey) IsExpired() bool {
	if k.ExpiresAt == nil {
		return false // No expiration
	}
	return time.Now().After(*k.ExpiresAt)
}

// MaskAPIKey masks an API key for logging (shows only prefix and last 4 chars)
func MaskAPIKey(apiKey string) string {
	if len(apiKey) <= 8 {
		return "***"
	}
	return apiKey[:4] + "****" + apiKey[len(apiKey)-4:]
}

// ValidateAndMask validates an API key format and returns a masked version
func (v *Validator) ValidateAndMask(apiKey string) (string, error) {
	if err := v.ValidateFormat(apiKey); err != nil {
		return "", err
	}
	return MaskAPIKey(apiKey), nil
}
