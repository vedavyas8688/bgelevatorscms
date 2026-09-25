<?php
include('database.inc.php');

session_start();
header("Access-Control-Allow-Origin: *");
header("Access-Control-Allow-Methods: POST, GET, OPTIONS");
header("Access-Control-Allow-Headers: Content-Type, Authorization");
header('Content-Type: application/json');

// Enable error reporting for debugging (disable in production)
error_reporting(E_ALL);
ini_set('display_errors', 1);

// Custom error logging function
function logError($message, $context = []) {
    $logFile = 'form_errors.log';
    $timestamp = date('Y-m-d H:i:s');
    $logEntry = "[{$timestamp}] {$message}";
    
    if (!empty($context)) {
        $logEntry .= " | Context: " . json_encode($context);
    }
    
    $logEntry .= PHP_EOL;
    
    // Write to log file
    file_put_contents($logFile, $logEntry, FILE_APPEND | LOCK_EX);
    
    // Also log to PHP error log
    error_log($logEntry);
}

// Debug logging function
function debugLog($message, $data = null) {
    $logFile = 'form_debug.log';
    $timestamp = date('Y-m-d H:i:s');
    $logEntry = "[{$timestamp}] DEBUG: {$message}";
    
    if ($data !== null) {
        $logEntry .= " | Data: " . print_r($data, true);
    }
    
    $logEntry .= PHP_EOL;
    file_put_contents($logFile, $logEntry, FILE_APPEND | LOCK_EX);
}

$response = [
    'status' => 'error',
    'message' => '',
];

try {
    debugLog("Request started", [
        'method' => $_SERVER['REQUEST_METHOD'],
        'content_type' => $_SERVER['CONTENT_TYPE'] ?? 'not set',
        'post_data' => $_POST,
        'raw_input' => file_get_contents('php://input')
    ]);

    if ($_SERVER['REQUEST_METHOD'] == 'OPTIONS') {
        debugLog("OPTIONS request handled");
        http_response_code(200);
        exit();
    } elseif ($_SERVER['REQUEST_METHOD'] == 'POST') {

        // Check if database connection exists
        if (!isset($con) || !$con) {
            logError("Database connection failed", ['mysqli_error' => mysqli_connect_error()]);
            $response['message'] = 'Database connection error';
            http_response_code(500);
            echo json_encode($response);
            exit();
        }

        debugLog("Processing POST request");

        // Updated field names to match your HTML form
        $Name = trim(mysqli_real_escape_string($con, $_POST['Name'] ?? ''));
        $Email = trim(mysqli_real_escape_string($con, $_POST['Email'] ?? ''));
        $Phonenumber = trim(mysqli_real_escape_string($con, $_POST['Phone'] ?? ''));
        $Location = trim(mysqli_real_escape_string($con, $_POST['Location'] ?? ''));
        $Message = trim(mysqli_real_escape_string($con, $_POST['Message'] ?? ''));

        debugLog("Form data extracted", [
            'name' => $Name,
            'email' => $Email,
            'phone' => $Phonenumber,
            'location' => $Location,
            'message' => substr($Message, 0, 100) . '...' // Log first 100 chars of message
        ]);

        $error_msg = "";
        $phone_err = "";

        // Validation with detailed logging
        if (empty($Name)) {
            $error_msg .= '*Name is required*';
            debugLog("Validation failed: Name is empty");
        }
        if (empty($Phonenumber)) {
            $phone_err .= '*Phone number is required*';
            debugLog("Validation failed: Phone number is empty");
        }
        if (empty($Email)) {
            $error_msg .= '*Email is required*';
            debugLog("Validation failed: Email is empty");
        }
        if (empty($Location)) {
            $error_msg .= '*Location is required*';
            debugLog("Validation failed: Location is empty");
        }

        // Validate phone number
        $cleanedPhone = preg_replace('/[^0-9]/', '', $Phonenumber); 
        debugLog("Phone validation", [
            'original' => $Phonenumber,
            'cleaned' => $cleanedPhone,
            'length' => strlen($cleanedPhone)
        ]);

        if (strlen($cleanedPhone) < 10 || strlen($cleanedPhone) > 15) {
            $phone_err .= '*Enter a valid Mobile Number*';
            debugLog("Phone validation failed: Invalid length");
        } else {
            $Phonenumber = $cleanedPhone;
        }

        // Validate email
        $email_exp = '/^[A-Za-z0-9._%-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,4}$/';
        debugLog("Email validation started", ['email' => $Email]);

        if (!preg_match($email_exp, $Email)) {
            $error_msg .= 'Please Enter an valid Email Address';
            debugLog("Email validation failed: Regex match failed");
        } else {
            // Remove spaces from the email address
            $cleanedEmail = str_replace(' ', '', $Email);

            // Check if the cleaned email address is valid
            if (!filter_var($cleanedEmail, FILTER_VALIDATE_EMAIL)) {
                $error_msg .= 'You entered an invalid email<br/>';
                debugLog("Email validation failed: Filter validation failed", ['cleaned_email' => $cleanedEmail]);
            } else {
                // Use the cleaned email address
                $Email = $cleanedEmail;
                debugLog("Email validation passed", ['final_email' => $Email]);
            }
        }

        debugLog("Validation completed", [
            'error_msg' => $error_msg,
            'phone_err' => $phone_err
        ]);

        if (empty($error_msg) && empty($phone_err)) {
            debugLog("All validations passed, proceeding with database insert");

            $html = "
                    Name: $Name <br>
                    Phone Number: $Phonenumber <br>
                    Email: $Email <br>
                    Location: $Location <br>
                    Message: $Message <br>
                ";

            // Updated database query to match your form fields
            $query = "INSERT INTO bgelevators_enquiries (Name, PhoneNumber, Email, Location, Message) 
                      VALUES ('$Name', '$Phonenumber', '$Email', '$Location', '$Message')";
            
            debugLog("Executing database query", ['query' => $query]);
            
            if (mysqli_query($con, $query)) {
                $insert_id = mysqli_insert_id($con);
                debugLog("Database insert successful", ['insert_id' => $insert_id]);
                mysqli_close($con);

                // Send email using mail() function
                $to = 'marketing@bgelevators.com';
                $subject = 'New BgElevators Inquiry';
                $headers = "MIME-Version: 1.0" . "\r\n";
                $headers .= "Content-type:text/html;charset=UTF-8" . "\r\n";
                $headers .= 'From: marketing@bgelevators.com' . "\r\n";
                $headers .= 'Reply-To: ' . $Email . "\r\n";
                
                debugLog("Attempting to send email", [
                    'to' => $to,
                    'subject' => $subject,
                    'from' => 'marketing@bgelevators.com',
                    'reply_to' => $Email
                ]);
                
                if (mail($to, $subject, $html, $headers)) {
                    debugLog("Email sent successfully");
                    $response['status'] = 'success';
                    $response['message'] = 'Form Submitted Successfully';
                    http_response_code(200);
                } else {
                    $mailError = error_get_last();
                    logError("Failed to send email", [
                        'to' => $to,
                        'subject' => $subject,
                        'last_error' => $mailError
                    ]);
                    $response['status'] = 'error';
                    $response['message'] = 'Failed to send email. Please try again.';
                    http_response_code(500);
                }
            } else {
                $dbError = mysqli_error($con);
                logError("Database insert failed", [
                    'query' => $query,
                    'mysql_error' => $dbError,
                    'mysql_errno' => mysqli_errno($con)
                ]);
                $response['message'] = 'Database error: ' . $dbError;
                http_response_code(500);
            }
        } else {
            debugLog("Validation errors found", [
                'error_msg' => $error_msg,
                'phone_err' => $phone_err
            ]);
            $response['errors'] = ['name' => $error_msg, 'tel' => $phone_err];
            http_response_code(400);
        }
    } else {
        debugLog("Invalid request method", ['method' => $_SERVER['REQUEST_METHOD']]);
        $response['message'] = 'Invalid Request Method';
        http_response_code(405); 
    }

} catch (Exception $e) {
    logError("Uncaught exception", [
        'message' => $e->getMessage(),
        'file' => $e->getFile(),
        'line' => $e->getLine(),
        'trace' => $e->getTraceAsString()
    ]);
    
    $response['status'] = 'error';
    $response['message'] = 'An unexpected error occurred';
    http_response_code(500);
} catch (Error $e) {
    logError("Fatal error", [
        'message' => $e->getMessage(),
        'file' => $e->getFile(),
        'line' => $e->getLine(),
        'trace' => $e->getTraceAsString()
    ]);
    
    $response['status'] = 'error';
    $response['message'] = 'A fatal error occurred';
    http_response_code(500);
}

debugLog("Request completed", ['response' => $response]);
echo json_encode($response);
?>