package utils

import (
	"net/http"
	"time"
)

// create a session for the user and sets a cookie
func CreateSession(w http.ResponseWriter, userID string) {
	http.SetCookie(w, &http.Cookie{
		Name:     "session-token",
		Value:    userID,
		Expires:  time.Now().Add(24 * time.Hour), // Session Valid for 24 Hours.
		HttpOnly: true,
		Path:     "/",
	})
}

// retrieves the session from the cookie
func GetSession(r *http.Request) (string, error) {
	cookie, err := r.Cookie("session-token")
	if err != nil {
		return "", err
	}
	return cookie.Value, nil
}

// clears the session cookie
func DestroySession(w http.ResponseWriter) {
	http.SetCookie(w, &http.Cookie{
		Name:     "session-token",
		Value:    "",
		Expires:  time.Now().Add(-1 * time.Hour), // Expire immediately
		HttpOnly: true,
		Path:     "/",
	})
}

// to ensure the user is authenticated
func AuthMiddleware(next http.HandlerFunc) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		sessionToken, err := GetSession(r)
		if err != nil || sessionToken == "" {
			http.Error(w, "Unauthorized", http.StatusUnauthorized)
			return
		}
		// if session exist, proceed to the next handler
		next(w, r)
	}
}
