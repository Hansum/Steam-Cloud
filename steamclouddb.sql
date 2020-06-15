-- phpMyAdmin SQL Dump
-- version 4.5.1
-- http://www.phpmyadmin.net
--
-- Host: 127.0.0.1
-- Generation Time: Nov 26, 2018 at 01:58 PM
-- Server version: 10.1.19-MariaDB
-- PHP Version: 7.0.13

SET SQL_MODE = "NO_AUTO_VALUE_ON_ZERO";
SET time_zone = "+00:00";


/*!40101 SET @OLD_CHARACTER_SET_CLIENT=@@CHARACTER_SET_CLIENT */;
/*!40101 SET @OLD_CHARACTER_SET_RESULTS=@@CHARACTER_SET_RESULTS */;
/*!40101 SET @OLD_COLLATION_CONNECTION=@@COLLATION_CONNECTION */;
/*!40101 SET NAMES utf8mb4 */;

--
-- Database: `steamclouddb`
--

-- --------------------------------------------------------

--
-- Table structure for table `book`
--

CREATE TABLE `book` (
  `bookId` int(11) NOT NULL,
  `title` varchar(128) NOT NULL,
  `ISBN` varchar(64) NOT NULL,
  `edition` varchar(11) NOT NULL,
  `year` int(11) NOT NULL,
  `category` enum('Arts and Music','Biographies','Business','Computers and Technology','Cooking','Educational & Reference','Health and Fitness','Literature','Medical','Social Science','Religion','Science and Math','Others') NOT NULL,
  `bookVerificationLevel` int(5) NOT NULL,
  `denyStatus` int(11) NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=latin1;

--
-- Dumping data for table `book`
--

INSERT INTO `book` (`bookId`, `title`, `ISBN`, `edition`, `year`, `category`, `bookVerificationLevel`, `denyStatus`) VALUES
(1, 'Godwin''s First Book', '1hyt511', '1st Edition', 2000, 'Computers and Technology', 1, 1),
(2, 'Maderazo''s First Book', 'kjl898789', '1st Edition', 2010, 'Arts and Music', 1, 1),
(3, 'Godwin''s Second Book Edited', 'kdjja989adkj', '1st Edition', 1934, 'Arts and Music', 1, 0),
(4, 'Godwin''s Third Book', 'jkajdk99kj', '1st Edition', 2015, 'Arts and Music', 1, 0),
(5, 'Delia''s New Book', 'jkjka7878', '1st Edition', 1999, 'Business', 1, 0),
(6, 'Belleza''s Biography', 'fgg777a89', '1st Edition', 2002, 'Biographies', 1, 0),
(7, 'edited', 'edited', '2nd Edition', 2012, 'Arts and Music', 1, 1),
(8, 'qew', 'wwerw', 'werw', 1999, 'Arts and Music', 1, 1),
(9, 'asd', 'asdas', 'dasd', 1999, 'Arts and Music', 0, 0),
(10, 'aasd', 'asda', 'ad', 1999, 'Business', 1, 0);

-- --------------------------------------------------------

--
-- Table structure for table `ched`
--

CREATE TABLE `ched` (
  `adminId` int(11) NOT NULL,
  `fname` varchar(64) NOT NULL,
  `lname` varchar(64) NOT NULL,
  `mname` varchar(64) NOT NULL,
  `email` varchar(64) NOT NULL,
  `password` varchar(64) NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=latin1;

--
-- Dumping data for table `ched`
--

INSERT INTO `ched` (`adminId`, `fname`, `lname`, `mname`, `email`, `password`) VALUES
(1, 'Ched', 'Admin', 'The', 'chedadmin@ched.gov.ph', 'chedadmin');

-- --------------------------------------------------------

--
-- Table structure for table `department`
--

CREATE TABLE `department` (
  `departmentId` int(11) NOT NULL,
  `departmentName` varchar(128) NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=latin1;

--
-- Dumping data for table `department`
--

INSERT INTO `department` (`departmentId`, `departmentName`) VALUES
(19, ' Department of Chemical Engineering'),
(17, ' Department of Science and Mathematics Education'),
(28, 'Bachelor of Library and Information Science'),
(13, 'Department of Accountancy'),
(3, 'Department of Anthropology, Sociology and History'),
(1, 'Department of Architecture '),
(4, 'Department of Biology'),
(14, 'Department of Business Administration'),
(5, 'Department of Chemistry'),
(20, 'Department of Civil Engineering'),
(6, 'Department of Communications, Linguistics, and Literature'),
(7, 'Department of Computer and Information Sciences'),
(21, 'Department of Computer Engineering'),
(15, 'Department of Economics'),
(22, 'Department of Electrical and Electronics Engineering'),
(2, 'Department of Fine Arts'),
(8, 'Department of General Education and Mission'),
(16, 'Department of Hospitality and Tourism'),
(23, 'Department of Industrial Engineering'),
(9, 'Department of Mathematics'),
(24, 'Department of Nursing'),
(25, 'Department of Nutrition and Dietetics'),
(10, 'Department of Philosophy'),
(11, 'Department of Physics'),
(26, 'Department of Political Science'),
(12, 'Department of Psychology'),
(18, 'Department of Teacher Education'),
(27, 'Law');

-- --------------------------------------------------------

--
-- Table structure for table `faculty`
--

CREATE TABLE `faculty` (
  `facultyId` int(11) NOT NULL,
  `departmentId` int(11) DEFAULT NULL,
  `schoolId` int(11) DEFAULT NULL,
  `institutionId` int(11) DEFAULT NULL,
  `fname` varchar(64) NOT NULL,
  `lname` varchar(64) NOT NULL,
  `mname` varchar(64) NOT NULL,
  `position` varchar(64) NOT NULL,
  `educationalAttainment` enum('Associate','Bachelor','Master','Doctorate') NOT NULL,
  `yearGraduated` int(11) NOT NULL,
  `schoolGraduated` varchar(128) NOT NULL,
  `gender` enum('Male','Female') NOT NULL,
  `dateOfBirth` date NOT NULL,
  `facultyType` enum('Full-time','Part-time') NOT NULL,
  `specialization` varchar(64) NOT NULL,
  `dateHired` date NOT NULL,
  `email` varchar(64) NOT NULL,
  `password` varchar(256) NOT NULL,
  `token` varchar(256) DEFAULT NULL,
  `accessLevel` enum('0','1','2','3','4','5') NOT NULL,
  `verificationLevel` enum('1','2','3','4','5') NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=latin1;

--
-- Dumping data for table `faculty`
--

INSERT INTO `faculty` (`facultyId`, `departmentId`, `schoolId`, `institutionId`, `fname`, `lname`, `mname`, `position`, `educationalAttainment`, `yearGraduated`, `schoolGraduated`, `gender`, `dateOfBirth`, `facultyType`, `specialization`, `dateHired`, `email`, `password`, `token`, `accessLevel`, `verificationLevel`) VALUES
(1, NULL, NULL, 1, 'Romeo ', 'Yap', 'K.', 'Registrar', 'Master', 1986, 'University of San Carlos', 'Male', '1974-06-03', 'Full-time', 'Social Psychology', '1999-02-04', 'romeoyap@gmail.com', 'bf45ada8a7a92e38cc', 'b002a6c0e41d91f10054a04690e69cc346172a0ca1977bfe7b8505e47e9b065b419ba552276b13922f4222836f2962b21a175cd10087edefe7883681e17cc0ea', '1', '1'),
(2, NULL, NULL, 2, 'Joel', 'Tabora', 'S.', 'Registrar', 'Master', 1991, 'Cebu Institute of Technology', 'Male', '1975-04-03', 'Full-time', 'Accountancy', '2000-02-05', 'joeltabora@gmail.com', 'a1b691ea9f9570464291', '97f3f9c5bf3fef8b695d3a30ea298faaf7fa4606bc5a9ecaa9d83e2e3d08f35cc3fb847b48121472765a20b7a507b4c258399907d9e07cc461e063a3e45c0418', '1', '1'),
(3, NULL, 1, 1, 'Delia', 'Belleza', 'l.', 'School Dean', 'Doctorate', 1995, 'University of the Philippines Diliman', 'Female', '1980-03-07', 'Full-time', 'Ph. D. Social Psychology', '1997-05-06', 'deliabelleza@gmail.com', '3bda7dab0236f575', 'fffb2a5e9a5249a2cb2293ab896fe0ea14d86d1e08f475ce5c5f5377863d6a680f214bfb1466295c68c3df9a1d8a80d964f19bb021a6a56460f7c09cb6e7de1d', '3', '3'),
(4, NULL, 2, 1, 'Edward', 'Sy', 'W.', 'School Dean', 'Bachelor', 1980, 'University of San Carlos', 'Male', '1970-03-06', 'Full-time', 'Computer Engineering', '1999-04-02', 'edward@gmail.com', 'b640baf640d4427928', '5be6b8048e3316c54ddd8360d75d1a55752a3407131bb877a792ab52f710ebfb6e432fc1de1d4162a6af4958bc44abcda94760df94766fd2ff391dcc5f9c6d9c', '3', '3'),
(5, 7, 1, 1, 'Christian', 'Maderazo', 'L.', 'Department Chairman', 'Master', 1983, 'University of San Carlos', 'Male', '1991-02-06', 'Full-time', 'Computer Engineering', '2000-03-05', 'maderazo@gmail.com', 'cd4bb64d099d80cf57', '674db220bc238b80315dc619a999da65feaf80ce556fdbb6a5c62eb767a1e12eb1db2f4da86bf61e74378869f4a5c4f0430c7990976fab233e46fa774e615d48', '4', '3'),
(6, 20, 2, 1, 'Kelly', 'Arnaiz', 'O.', 'Department Chairman', 'Associate', 1979, 'University of San Carlos', 'Male', '1971-05-31', 'Full-time', 'Civil Engineering', '2000-03-05', 'kelly@gmail.com', '0ef86468696db8ca44', 'bf584d93dc091984f00c5740962eb6b8770582f91f6017c2a20b8f92085e0d948d8ecd2e92e5dc8d17e2a158bf6a16d43aa5268461edf2ca5657a84a1fddf1ba', '4', '3'),
(7, 7, 1, 1, 'Godwin', 'Monserate', 'Test', 'Regular Faculty', 'Master', 1990, 'De la Salle University', 'Male', '1970-11-11', 'Full-time', 'Accountancy', '2000-12-05', 'godwin@gmail.com', '459dd9b2db4423d889', 'f989449d8218060ea39bce6150ddf77be19baf234c727daddb21bab86d75010a70dd0dafaa54c5263bc2065eaabef017a344c6c4791592728f29d95bc5b42a2a', '5', '3'),
(8, 20, 2, 1, 'Fatima', 'Culibra', 'I.', 'Regular Faculty', 'Bachelor', 1972, 'University of the Philippines Diliman', 'Male', '1955-03-05', 'Full-time', 'Mechanical Engineering', '1990-03-04', 'culibra@gmail.com', '068b224bf966019928', '72382e58343f174807b2af63115138df168f31399e796ce86fa403c7ac927c37dc0eced4b02955d08e7927be72a36f66f57dde111e44e92eb5b54f6b25ea7863', '5', '3'),
(9, NULL, 1, 2, 'Alberto', 'Ruiz', 'L.', 'School Dean', 'Bachelor', 1975, 'University of San Jose Recoletos', 'Male', '1988-01-03', 'Full-time', 'Accountancy', '2000-04-05', 'alberto@gmail.com', 'cdb0fe7b9baeada3c2', '874c33cc68c7e60ab44c30f4cd2852c043a2846a72b0bbce2843def45f91651a096fdb720dc193175e3ad519c7455f844996d2652e148eac106cef286d29aca1', '3', '3'),
(10, NULL, 2, 2, 'Tsanselor', 'Tan', 'O.', 'School Dean', 'Associate', 1992, 'University of Cebu', 'Male', '1970-03-06', 'Full-time', 'Accountancy', '2001-02-04', 'tan@gmail.com', 'a1965d8f7d75301b', '3fbcea6c1d5360fc96562f3cc5095784f141efe27b524a3282ba0cd347b5c0be86384f8abf46c089be18269802435fcbb7cdf24259dcbda3061423c1d5957208', '3', '3'),
(11, 7, 1, 2, 'Maris', 'Rosario', 'I.', 'Department Chairman', 'Master', 1967, 'University of the Philippines Diliman', 'Male', '1955-01-05', 'Full-time', 'Law', '1974-04-04', 'rosario@gmail.com', '9fa3364f1ed362b2a0', '68e46f4db3fa4aabe68aa81a3e039c26a7ba6c3f5a3ecfd801b98042554bc1eda6c4777c660e7d3e01e9032ddf440d4547eebcf1d9e9acc0551e78662a740837', '4', '3'),
(12, 20, 2, 2, 'Alex', 'Lumapas', 'U', 'Department Chairman', 'Doctorate', 1982, 'T.', 'Male', '1975-03-06', 'Full-time', 'Chemical Engineering', '2003-03-05', 'lumapas@gmail.com', 'be556e47fbd7ca80e8', 'b943996fa29474356ec580a2afc61fa2bbcadf0c826a7cb50c754d6b2c0c2cf84a62179482758c9f5bb603307bc75ffee7af1b2ba3f7ca200da938cce03cadcb', '4', '3'),
(13, 7, 1, 2, 'Mark', 'Quevedo', 'S.', 'Regular Faculty', 'Master', 1992, 'University of San Carlos', 'Male', '1982-02-04', 'Full-time', 'Information Technology', '2001-03-05', 'quevedo@gmail.com', 'f3f2303c7b5f3bf008', '121aa63a68a84c3acb60e4ca5b20f6010e62eba0c462d0046cd417a5b59157f07dc6311f5895c2d25df93f96ae959f3818075bec85fd1785e4b231dac4943b13', '5', '3'),
(14, 20, 2, 2, 'Hana', 'Astrid', 'I.', 'Regular Faculty', 'Associate', 1991, 'University of San Carlos', 'Male', '1986-03-05', 'Part-time', 'Chemical Engineering', '2003-04-05', 'astrid@gmail.com', '809468998121704c1e', '3df957cc002e594cb32456f80ecf72fc7697089ff4bc36b7bd906dc1c275c26c379b13afcffb3066b1c30a18cd73302c0f89a7a3cfd77abda6d7a935c53d1fff', '5', '3'),
(15, NULL, NULL, 1, 'Dionisio', 'Miranda', 'Madden', 'Institution Director', 'Doctorate', 1999, 'University of the Philippines Diliman', 'Male', '1950-11-27', 'Full-time', 'Ph. D. Social Psychology', '2014-12-31', 'miranda@gmail.com', '423419f31ce704514d', '7e204b1986b09ce54b6e5a278c0f12434952a2629471739a884d44f3dfb424497fcf194d446ba8ccb48ab4491fbe9a9c7c39c399a800a3407e4ffe42c68a21e4', '2', '2'),
(16, NULL, NULL, 3, 'Roberto ', 'Bucog', 'M', 'Registrar', 'Master', 1998, 'University of the Philippines - Diliman', 'Male', '1985-08-29', 'Full-time', 'Computer Science', '2000-11-26', 'bucog@gmail.com', '52170c66e83cb326d0', '0a11acaeab9ef4889fa392c8fc4c4fcbc628cee348ef8e5931b05b1e71422756ca03cc7d588f98570fc434360b2e32f7a1cd7a1da093cbd3848182807bb58608', '1', '1'),
(18, NULL, 3, 1, 'SBE', 'School Dean', 'A', 'School Dean', 'Associate', 1990, 'University of San Carlos', 'Male', '1970-01-01', 'Full-time', 'Clinical Psychology', '2000-01-01', 'renzoaouano@gmail.com', 'd6812ecbac6e6aab0c', '2447bf9d0709bcd8806a011cff99df1af9ef5f11f2ba1e5a555a1bc8199380297973d0835c7087ec2df46126a5495fd73c6daacff6afa17a62a790b8a0f01fb1', '3', '3'),
(19, 14, 3, 1, 'Chairman', 'Test', 'A', 'Department Chairman', 'Associate', 1980, 'test', 'Female', '1995-09-09', 'Full-time', 'Business Administration', '2000-01-11', 'jjmandiadi@gmail.com', '47355230298a9565d9', 'ed76284997383756c66e39a57243e11cff07be7c8db1a46538487ef1483d3f7e8e90ff886ad6d356089638495d32b7057982a5e8f35717767470a54fa29a0d89', '4', '3'),
(20, NULL, NULL, 1, 'test', 'test', 't', 'Regular Faculty', 'Associate', 2000, 'test', 'Male', '1990-01-01', 'Full-time', 'test', '2000-01-01', 'christianvargan@gmail.com', '1e5c32ef886526c82a', '516b9080496762937d67933fdde959fcce50b077604a060d56454835c8f25b6831da70591522e158948fe6368341ce6a68f99cf3806319e57959c20ae33b7dbf', '5', '3'),
(21, NULL, 4, 1, 'hjkh', 'hjkhkh', 'kljlj', 'School Dean', 'Associate', 1980, 'jljjk', 'Male', '1996-11-26', 'Part-time', 'ljkjk', '2008-09-27', 'eld@gmail.com', '2a0bdb8b435b2dc819', '53110cc7edf5b1390dd758116399bfdffdd31b2f7213df9d95f7c0e686e14f68908c8b68a1f7e9a87d592b2598779714de2a7fe92faf067f68ac300a50872c4a', '3', '3'),
(22, 28, 1, 1, 'kjklj', 'jljljlj', 'jljjljl', 'Department Chairman', 'Associate', 1940, 'lkjkljl', 'Female', '1991-11-26', 'Part-time', 'kljlk', '2013-10-28', 'bla@gmail.com', 'e3861bb6b47c0878e6', '7796bada255969dc4c74d256849413d0960c1fe78dc8cb723bf4f372da8121d91d05fff084c57b505f02e7db351fe2aad96d49d241f5cad5c2b12c55d459176d', '4', '3'),
(23, NULL, 6, 1, 'adad', 'asd', 'asd', 'School Dean', 'Associate', 1944, 'asd', 'Female', '1995-11-29', 'Part-time', 'asd', '2016-10-30', 'bla2@gmail.com', '67bea5699d0f3027d2', '6d36126eb6f83b8f7ce6e45e1213b180eceb6db0a061d1b814e03693b966d6220f64a4da68b615f9570ea483fd79dad6fcbd9d0fa3ed92222aefca7658c7a991', '3', '3'),
(24, 19, 1, 1, 'asdad', 'asd', 'asda', 'Department Chairman', 'Associate', 1980, 'asda', 'Male', '1996-11-28', 'Part-time', 'qsad', '2014-10-29', 'dumby@gmail.com', '60aa9fbc7faef49ed5', '4f19553e38e77274ed6dcc88c2f821ea01d5c235219986031a5612ecf2c84f624f063c98abcdf9f04fe4e2d89906f160a09ce9fe6aa78ed58e37c82f662551fd', '4', '3'),
(25, NULL, NULL, 1, 'qwe', 'werw', 'rwrwq', 'Active Faculty', 'Associate', 1980, 'uoououo', 'Female', '1996-11-29', 'Part-time', 'iuiou', '2016-10-29', 'new@gmail.com', 'c8bed6bd3c4f4f120a', '8577d425d99d9fcf1f461fdf66cb67fbc5034f7e26f3f3bbceb39074c53b70a8c5a322e44a4a91410b7329bd80cd4fd52a8da5729d79d0bfe12ffd0367fc91dd', '5', '3'),
(27, NULL, NULL, 5, 't', 't', 't', 'Registrar', 'Associate', 1994, 'Cebu Doctor''s University', 'Male', '1987-02-04', 'Full-time', 'Information Technology', '2001-03-04', 'testing123@gmail.com', 'f1730df1fbd58e0eed', '73c6a5fcc51f5aa6ff30d84733fbb5a1977c7ec14a414434dcf453aade7995fd9577f1588a8e2748a6e66ce86e95713e4f3bbebb84fdaf5591cbbf73e587c11d', '1', '1');

-- --------------------------------------------------------

--
-- Table structure for table `faculty_book`
--

CREATE TABLE `faculty_book` (
  `facultyId` int(11) NOT NULL,
  `bookId` int(11) NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=latin1;

--
-- Dumping data for table `faculty_book`
--

INSERT INTO `faculty_book` (`facultyId`, `bookId`) VALUES
(7, 1),
(5, 2),
(7, 3),
(7, 4),
(3, 5),
(3, 6),
(15, 7),
(15, 8),
(7, 9),
(6, 10);

-- --------------------------------------------------------

--
-- Table structure for table `faculty_journal`
--

CREATE TABLE `faculty_journal` (
  `facultyId` int(11) NOT NULL,
  `journalId` int(11) NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=latin1;

--
-- Dumping data for table `faculty_journal`
--

INSERT INTO `faculty_journal` (`facultyId`, `journalId`) VALUES
(7, 1),
(5, 2),
(7, 3),
(7, 4),
(15, 5);

-- --------------------------------------------------------

--
-- Table structure for table `faculty_presentation`
--

CREATE TABLE `faculty_presentation` (
  `facultyId` int(255) NOT NULL,
  `presentationId` int(255) NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=latin1;

--
-- Dumping data for table `faculty_presentation`
--

INSERT INTO `faculty_presentation` (`facultyId`, `presentationId`) VALUES
(7, 2),
(7, 3),
(8, 4),
(7, 5),
(5, 6),
(7, 7),
(6, 8),
(3, 9);

-- --------------------------------------------------------

--
-- Table structure for table `faculty_research`
--

CREATE TABLE `faculty_research` (
  `facultyId` int(11) NOT NULL,
  `researchId` int(11) NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=latin1;

--
-- Dumping data for table `faculty_research`
--

INSERT INTO `faculty_research` (`facultyId`, `researchId`) VALUES
(7, 1),
(5, 2),
(7, 3),
(7, 4),
(15, 5);

-- --------------------------------------------------------

--
-- Table structure for table `faculty_thesis`
--

CREATE TABLE `faculty_thesis` (
  `facultyId` int(11) NOT NULL,
  `thesisId` int(11) NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=latin1;

--
-- Dumping data for table `faculty_thesis`
--

INSERT INTO `faculty_thesis` (`facultyId`, `thesisId`) VALUES
(5, 1);

-- --------------------------------------------------------

--
-- Table structure for table `institution`
--

CREATE TABLE `institution` (
  `institutionId` int(11) NOT NULL,
  `directorId` int(11) DEFAULT NULL,
  `institutionName` varchar(128) NOT NULL,
  `address` varchar(128) NOT NULL,
  `region_id` int(255) DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=latin1;

--
-- Dumping data for table `institution`
--

INSERT INTO `institution` (`institutionId`, `directorId`, `institutionName`, `address`, `region_id`) VALUES
(1, 15, 'University of San Carlos', 'Nasipit, Talamban,Cebu City', 3),
(2, NULL, 'University of San Jose Recoletos', 'Balamban, Cebu', 3),
(3, NULL, 'University of the Philippines', 'Roxas Ave, Diliman, Quezon City, Metro Manila', 4),
(5, NULL, 'Ateneo', 'Test Address', 2);

-- --------------------------------------------------------

--
-- Table structure for table `institution_department`
--

CREATE TABLE `institution_department` (
  `institutionId` int(11) NOT NULL,
  `schoolId` int(11) NOT NULL,
  `departmentId` int(11) NOT NULL,
  `chairmanId` int(11) DEFAULT NULL,
  `centerOfDevelopment` varchar(256) DEFAULT NULL,
  `centerOfExcellence` varchar(256) DEFAULT NULL,
  `description` varchar(255) NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=latin1;

--
-- Dumping data for table `institution_department`
--

INSERT INTO `institution_department` (`institutionId`, `schoolId`, `departmentId`, `chairmanId`, `centerOfDevelopment`, `centerOfExcellence`, `description`) VALUES
(1, 1, 7, 5, NULL, 'Certified', ''),
(1, 2, 20, 6, 'Certified', NULL, ''),
(2, 1, 7, 11, 'Certified', NULL, ''),
(2, 2, 20, 12, 'Certified', NULL, ''),
(1, 3, 14, 19, 'Certified', NULL, ''),
(1, 1, 28, 22, NULL, NULL, 'testing ths one for the good one'),
(1, 1, 19, 24, NULL, NULL, 'Help understand what is understanding');

-- --------------------------------------------------------

--
-- Table structure for table `institution_program`
--

CREATE TABLE `institution_program` (
  `programId` int(11) NOT NULL,
  `institutionId` int(11) NOT NULL,
  `schoolId` int(11) NOT NULL,
  `departmentId` int(11) NOT NULL,
  `description` varchar(255) NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=latin1;

--
-- Dumping data for table `institution_program`
--

INSERT INTO `institution_program` (`programId`, `institutionId`, `schoolId`, `departmentId`, `description`) VALUES
(30, 2, 1, 7, ''),
(21, 2, 2, 20, ''),
(21, 1, 2, 20, ''),
(42, 1, 1, 7, ''),
(2, 1, 1, 7, 'digidigdigidig'),
(30, 1, 1, 7, 'Information Technology');

-- --------------------------------------------------------

--
-- Table structure for table `institution_school`
--

CREATE TABLE `institution_school` (
  `institutionId` int(11) NOT NULL,
  `schoolId` int(11) NOT NULL,
  `deanId` int(11) DEFAULT NULL,
  `description` varchar(255) NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=latin1;

--
-- Dumping data for table `institution_school`
--

INSERT INTO `institution_school` (`institutionId`, `schoolId`, `deanId`, `description`) VALUES
(1, 1, 3, ''),
(1, 2, 4, ''),
(2, 1, 9, ''),
(2, 2, 10, ''),
(1, 3, 18, ''),
(1, 4, 21, 'Dummy testing'),
(1, 6, 23, 'blabbalblassldkjfl');

-- --------------------------------------------------------

--
-- Table structure for table `journal`
--

CREATE TABLE `journal` (
  `journalId` int(11) NOT NULL,
  `title` varchar(128) NOT NULL,
  `link` varchar(256) NOT NULL,
  `year` int(11) NOT NULL,
  `volume` varchar(11) NOT NULL,
  `category` enum('Arts and Music','Biographies','Business','Computers and Technology','Cooking','Educational & Reference','Health and Fitness','Literature','Medical','Social Science','Religion','Science and Math','Others') NOT NULL,
  `journalVerificationLevel` int(5) NOT NULL,
  `journalDenyStatus` int(11) NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=latin1;

--
-- Dumping data for table `journal`
--

INSERT INTO `journal` (`journalId`, `title`, `link`, `year`, `volume`, `category`, `journalVerificationLevel`, `journalDenyStatus`) VALUES
(1, 'Godwin''s First Journal', 'www.godwin..com', 2001, 'Volume 1', 'Arts and Music', 1, 1),
(2, 'Maderazo''s First Journal', 'www.maderazo.com', 2010, 'Volume 1', 'Arts and Music', 1, 1),
(3, 'Godwin''s Secind Journal', 'www.belleza..com', 1915, 'Volume 3', 'Arts and Music', 1, 0),
(4, 'Deny This Journal Godwin', 'www.linked.com', 1949, 'Volume 4', 'Arts and Music', 1, 0),
(5, 'asda', 'qeerw', 2012, 'Volume 1', 'Arts and Music', 1, 0);

-- --------------------------------------------------------

--
-- Table structure for table `presentation`
--

CREATE TABLE `presentation` (
  `presentationId` int(255) NOT NULL,
  `presentationName` varchar(255) NOT NULL,
  `paperName` varchar(255) NOT NULL,
  `date` date NOT NULL,
  `presentVerificationLevel` int(11) NOT NULL,
  `presentDenyStatus` int(11) NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=latin1;

--
-- Dumping data for table `presentation`
--

INSERT INTO `presentation` (`presentationId`, `presentationName`, `paperName`, `date`, `presentVerificationLevel`, `presentDenyStatus`) VALUES
(2, 'godwin', 'godwin', '2015-11-24', 1, 1),
(3, 'Godwin''s First Presentation', 'BlaBla', '2015-11-30', 1, 1),
(4, 'culibra', 'brah', '2013-11-24', 1, 0),
(5, 'newest', 'newest', '2015-11-28', 0, 1),
(6, 'maderazo''s new edited', 'newset edited', '2000-10-29', 1, 0),
(7, 'edited rpes', 'edited', '2016-09-30', 1, 0),
(8, 'arnaiz', 'bla', '1998-02-23', 1, 0),
(9, 'delia''s presentation edited', 'edited', '2018-12-31', 1, 0);

-- --------------------------------------------------------

--
-- Table structure for table `program`
--

CREATE TABLE `program` (
  `programId` int(11) NOT NULL,
  `programName` varchar(128) NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=latin1;

--
-- Dumping data for table `program`
--

INSERT INTO `program` (`programId`, `programName`) VALUES
(2, 'Bachelor of Arts in Anthropology'),
(3, 'Bachelor of Arts in History'),
(4, 'Bachelor of Arts in Linguistics and Literature'),
(5, 'Bachelor of Arts in Sociology'),
(6, 'Bachelor of Education in Early Childhood'),
(7, 'Bachelor of Education in Special Education'),
(8, 'Bachelor of Elementary Education'),
(9, 'Bachelor of Fine Arts'),
(10, 'Bachelor of Laws'),
(11, 'Bachelor of Philosophy'),
(12, 'Bachelor of Political Science'),
(13, 'Bachelor of Science in Accountancy'),
(14, 'Bachelor of Science in Accounting Technology'),
(15, 'Bachelor of Science in Applied Physics'),
(16, 'Bachelor of Science in Architecture'),
(17, 'Bachelor of Science in Biology'),
(18, 'Bachelor of Science in Business Administration'),
(20, 'Bachelor of Science in Chemistry'),
(21, 'Bachelor of Science in Civil Engineering'),
(22, 'Bachelor of Science in Clinical Pharmaceutical Sciences'),
(23, 'Bachelor of Science in Computer Engineering'),
(42, 'Bachelor of Science in Data Science'),
(24, 'Bachelor of Science in Economics'),
(25, 'Bachelor of Science in Electrical Engineering'),
(26, 'Bachelor of Science in Electronics Engineering'),
(27, 'Bachelor of Science in Entrepreneurship'),
(28, 'Bachelor of Science in Hotel and Restaurant Management'),
(29, 'Bachelor of Science in Industrial Engineering'),
(30, 'Bachelor of Science in Information Technology'),
(31, 'Bachelor of Science in Interior Design'),
(32, 'Bachelor of Science in Landscape Architecture'),
(33, 'Bachelor of Science in Marine Biology'),
(34, 'Bachelor of Science in Mathematics'),
(35, 'Bachelor of Science in Mechanical Engineering'),
(36, 'Bachelor of Science in Nursing'),
(37, 'Bachelor of Science in Nutrition and Dietetics'),
(38, 'Bachelor of Science in Pharmacy'),
(39, 'Bachelor of Science in Psychology'),
(40, 'Bachelor of Secondary Education'),
(41, 'Bachelor of Tourism Management');

-- --------------------------------------------------------

--
-- Table structure for table `programdata`
--

CREATE TABLE `programdata` (
  `programId` int(11) NOT NULL,
  `institutionId` int(11) NOT NULL,
  `departmentId` int(11) DEFAULT NULL,
  `schoolId` int(11) NOT NULL,
  `year` int(11) NOT NULL,
  `availability` enum('Offered','Not Offered','','') NOT NULL,
  `population` int(11) NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=latin1;

--
-- Dumping data for table `programdata`
--

INSERT INTO `programdata` (`programId`, `institutionId`, `departmentId`, `schoolId`, `year`, `availability`, `population`) VALUES
(21, 2, 20, 2, 2018, 'Offered', 700),
(21, 1, 20, 2, 2012, 'Offered', 1000),
(21, 1, 20, 2, 2013, 'Offered', 1500),
(21, 1, 20, 2, 2014, 'Offered', 2000),
(42, 1, 7, 1, 2017, 'Offered', 170),
(30, 1, 7, 1, 2018, 'Offered', 400);

-- --------------------------------------------------------

--
-- Table structure for table `region`
--

CREATE TABLE `region` (
  `region_id` int(255) NOT NULL,
  `regionName` varchar(1000) NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=latin1;

--
-- Dumping data for table `region`
--

INSERT INTO `region` (`region_id`, `regionName`) VALUES
(2, 'Region II'),
(3, 'Region VII'),
(4, 'NCR');

-- --------------------------------------------------------

--
-- Table structure for table `research`
--

CREATE TABLE `research` (
  `researchId` int(11) NOT NULL,
  `name` varchar(128) NOT NULL,
  `status` enum('Ongoing','Completed') NOT NULL,
  `collaborations` varchar(256) NOT NULL,
  `description` varchar(256) NOT NULL,
  `coresearchers` varchar(256) NOT NULL,
  `category` enum('Arts and Music','Biographies','Business','Computers and Technology','Cooking','Educational & Reference','Health and Fitness','Literature','Medical','Social Science','Religion','Science and Math','Others') NOT NULL,
  `year` int(11) NOT NULL,
  `researchVerificationLevel` int(5) NOT NULL,
  `reserchDenyStatus` int(11) NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=latin1;

--
-- Dumping data for table `research`
--

INSERT INTO `research` (`researchId`, `name`, `status`, `collaborations`, `description`, `coresearchers`, `category`, `year`, `researchVerificationLevel`, `reserchDenyStatus`) VALUES
(1, 'Godwin''s New Research', 'Ongoing', 'Team STEAM', 'Cisco Research', 'Team STEAM', 'Arts and Music', 2004, 1, 1),
(2, 'Maderazo''s First Research', 'Ongoing', 'Team STEAM', 'New Department Chairman', 'Team STEAM', 'Arts and Music', 2001, 1, 1),
(3, 'New Research for Godwin', 'Ongoing', 'DCIS', 'Cisco 2 Research', 'New Team', 'Health and Fitness', 2006, 1, 0),
(4, 'Computer Detection', 'Completed', 'Category Collabs', 'Computer AI', 'Renzo Ouano, Jones Joseph Mandiadi, Christian Donne Vargan', 'Arts and Music', 2001, 1, 0),
(5, 'adasd', 'Ongoing', 'asads', 'asdas', 'sasda', 'Arts and Music', 2012, 1, 0);

-- --------------------------------------------------------

--
-- Table structure for table `school`
--

CREATE TABLE `school` (
  `schoolId` int(11) NOT NULL,
  `schoolName` varchar(128) NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=latin1;

--
-- Dumping data for table `school`
--

INSERT INTO `school` (`schoolId`, `schoolName`) VALUES
(8, 'aaaaaaaaa'),
(1, 'School of Arts and Science'),
(3, 'School of Business and Economics'),
(4, 'School of Dummy'),
(2, 'School of Engineering'),
(6, 'School of new'),
(7, 'school ofname'),
(9, 'zzzzzzzzzz');

-- --------------------------------------------------------

--
-- Table structure for table `student`
--

CREATE TABLE `student` (
  `studentId` int(11) NOT NULL,
  `departmentId` int(11) NOT NULL,
  `programId` int(11) NOT NULL,
  `fname` varchar(64) NOT NULL,
  `lname` varchar(64) NOT NULL,
  `mname` varchar(64) NOT NULL,
  `yearLevel` enum('1','2','3','4','5') NOT NULL,
  `gender` enum('m','f') NOT NULL,
  `dateOfBirth` date NOT NULL,
  `status` enum('regular','probationary') NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=latin1;

-- --------------------------------------------------------

--
-- Table structure for table `studentdata`
--

CREATE TABLE `studentdata` (
  `departmentId` int(11) NOT NULL,
  `schoolId` int(11) NOT NULL,
  `institutionId` int(11) NOT NULL,
  `year` int(11) NOT NULL,
  `enrollees` int(11) NOT NULL,
  `graduated` int(11) DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=latin1;

--
-- Dumping data for table `studentdata`
--

INSERT INTO `studentdata` (`departmentId`, `schoolId`, `institutionId`, `year`, `enrollees`, `graduated`) VALUES
(7, 1, 1, 2000, 300, 250),
(20, 2, 1, 2001, 750, 540),
(20, 2, 1, 2000, 200, 250),
(7, 1, 2, 2001, 500, 400),
(20, 2, 2, 2002, 450, 350),
(7, 1, 2, 2002, 450, 350),
(19, 1, 1, 2001, 200, 300);

-- --------------------------------------------------------

--
-- Table structure for table `thesis`
--

CREATE TABLE `thesis` (
  `thesisId` int(11) NOT NULL,
  `adviserId` int(11) NOT NULL,
  `title` varchar(255) NOT NULL,
  `dateDefended` date NOT NULL,
  `publicationStatus` enum('Published','Unpublished') NOT NULL,
  `topic` enum('Arts and Music','Biographies','Business','Computers and Technology','Cooking','Educational & Reference','Health and Fitness','Literature','Medical','Social Science','Religion','Science and Math','Others') NOT NULL,
  `student_author` varchar(255) NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=latin1;

--
-- Dumping data for table `thesis`
--

INSERT INTO `thesis` (`thesisId`, `adviserId`, `title`, `dateDefended`, `publicationStatus`, `topic`, `student_author`) VALUES
(1, 5, 'Maderazo''s New Thesis', '2013-11-26', 'Published', 'Arts and Music', 'Jose Erwin Valmoria');

--
-- Indexes for dumped tables
--

--
-- Indexes for table `book`
--
ALTER TABLE `book`
  ADD PRIMARY KEY (`bookId`);

--
-- Indexes for table `ched`
--
ALTER TABLE `ched`
  ADD PRIMARY KEY (`adminId`);

--
-- Indexes for table `department`
--
ALTER TABLE `department`
  ADD PRIMARY KEY (`departmentId`),
  ADD UNIQUE KEY `departmentName` (`departmentName`);

--
-- Indexes for table `faculty`
--
ALTER TABLE `faculty`
  ADD PRIMARY KEY (`facultyId`),
  ADD UNIQUE KEY `email` (`email`),
  ADD KEY `departmentId` (`departmentId`),
  ADD KEY `departmentId_2` (`departmentId`),
  ADD KEY `departmentId_3` (`departmentId`),
  ADD KEY `departmentId_4` (`departmentId`),
  ADD KEY `schoolId` (`schoolId`),
  ADD KEY `institutionId` (`institutionId`);

--
-- Indexes for table `faculty_book`
--
ALTER TABLE `faculty_book`
  ADD KEY `facultyId` (`facultyId`),
  ADD KEY `bookId` (`bookId`);

--
-- Indexes for table `faculty_journal`
--
ALTER TABLE `faculty_journal`
  ADD KEY `facultyId` (`facultyId`),
  ADD KEY `journalId` (`journalId`),
  ADD KEY `facultyId_2` (`facultyId`);

--
-- Indexes for table `faculty_presentation`
--
ALTER TABLE `faculty_presentation`
  ADD KEY `presentation_facultyId` (`facultyId`),
  ADD KEY `presentation_presentationId` (`presentationId`);

--
-- Indexes for table `faculty_research`
--
ALTER TABLE `faculty_research`
  ADD KEY `facultyId` (`facultyId`),
  ADD KEY `researchId` (`researchId`);

--
-- Indexes for table `faculty_thesis`
--
ALTER TABLE `faculty_thesis`
  ADD KEY `studentId` (`facultyId`),
  ADD KEY `thesisId` (`thesisId`);

--
-- Indexes for table `institution`
--
ALTER TABLE `institution`
  ADD PRIMARY KEY (`institutionId`),
  ADD UNIQUE KEY `institutionName` (`institutionName`),
  ADD KEY `fk_director` (`directorId`),
  ADD KEY `region_id` (`region_id`);

--
-- Indexes for table `institution_department`
--
ALTER TABLE `institution_department`
  ADD KEY `institutionId` (`institutionId`),
  ADD KEY `schoolId` (`schoolId`),
  ADD KEY `chairmanId` (`chairmanId`),
  ADD KEY `institutionId_2` (`institutionId`),
  ADD KEY `departmentId` (`departmentId`);

--
-- Indexes for table `institution_program`
--
ALTER TABLE `institution_program`
  ADD KEY `programId` (`programId`),
  ADD KEY `institutionId` (`institutionId`),
  ADD KEY `departmentId` (`departmentId`),
  ADD KEY `schoolId` (`schoolId`);

--
-- Indexes for table `institution_school`
--
ALTER TABLE `institution_school`
  ADD KEY `institutionId` (`institutionId`),
  ADD KEY `schoolId` (`schoolId`),
  ADD KEY `deanId` (`deanId`);

--
-- Indexes for table `journal`
--
ALTER TABLE `journal`
  ADD PRIMARY KEY (`journalId`);

--
-- Indexes for table `presentation`
--
ALTER TABLE `presentation`
  ADD PRIMARY KEY (`presentationId`);

--
-- Indexes for table `program`
--
ALTER TABLE `program`
  ADD PRIMARY KEY (`programId`),
  ADD UNIQUE KEY `programName` (`programName`);

--
-- Indexes for table `programdata`
--
ALTER TABLE `programdata`
  ADD KEY `programId` (`programId`),
  ADD KEY `programId_2` (`programId`),
  ADD KEY `institutionId` (`institutionId`),
  ADD KEY `departmentId` (`departmentId`),
  ADD KEY `schoolId` (`schoolId`);

--
-- Indexes for table `region`
--
ALTER TABLE `region`
  ADD PRIMARY KEY (`region_id`);

--
-- Indexes for table `research`
--
ALTER TABLE `research`
  ADD PRIMARY KEY (`researchId`),
  ADD KEY `name` (`name`);

--
-- Indexes for table `school`
--
ALTER TABLE `school`
  ADD PRIMARY KEY (`schoolId`),
  ADD UNIQUE KEY `schoolName` (`schoolName`);

--
-- Indexes for table `student`
--
ALTER TABLE `student`
  ADD PRIMARY KEY (`studentId`),
  ADD KEY `departmentId` (`departmentId`),
  ADD KEY `programId` (`programId`);

--
-- Indexes for table `studentdata`
--
ALTER TABLE `studentdata`
  ADD KEY `departmentId` (`departmentId`),
  ADD KEY `institutionId` (`institutionId`),
  ADD KEY `schoolId` (`schoolId`);

--
-- Indexes for table `thesis`
--
ALTER TABLE `thesis`
  ADD PRIMARY KEY (`thesisId`),
  ADD KEY `facultyId` (`adviserId`);

--
-- AUTO_INCREMENT for dumped tables
--

--
-- AUTO_INCREMENT for table `book`
--
ALTER TABLE `book`
  MODIFY `bookId` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=11;
--
-- AUTO_INCREMENT for table `ched`
--
ALTER TABLE `ched`
  MODIFY `adminId` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=2;
--
-- AUTO_INCREMENT for table `department`
--
ALTER TABLE `department`
  MODIFY `departmentId` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=29;
--
-- AUTO_INCREMENT for table `faculty`
--
ALTER TABLE `faculty`
  MODIFY `facultyId` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=28;
--
-- AUTO_INCREMENT for table `institution`
--
ALTER TABLE `institution`
  MODIFY `institutionId` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=6;
--
-- AUTO_INCREMENT for table `journal`
--
ALTER TABLE `journal`
  MODIFY `journalId` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=6;
--
-- AUTO_INCREMENT for table `presentation`
--
ALTER TABLE `presentation`
  MODIFY `presentationId` int(255) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=10;
--
-- AUTO_INCREMENT for table `program`
--
ALTER TABLE `program`
  MODIFY `programId` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=43;
--
-- AUTO_INCREMENT for table `region`
--
ALTER TABLE `region`
  MODIFY `region_id` int(255) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=5;
--
-- AUTO_INCREMENT for table `research`
--
ALTER TABLE `research`
  MODIFY `researchId` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=6;
--
-- AUTO_INCREMENT for table `school`
--
ALTER TABLE `school`
  MODIFY `schoolId` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=12;
--
-- AUTO_INCREMENT for table `student`
--
ALTER TABLE `student`
  MODIFY `studentId` int(11) NOT NULL AUTO_INCREMENT;
--
-- AUTO_INCREMENT for table `thesis`
--
ALTER TABLE `thesis`
  MODIFY `thesisId` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=2;
--
-- Constraints for dumped tables
--

--
-- Constraints for table `faculty`
--
ALTER TABLE `faculty`
  ADD CONSTRAINT `faculty_ibfk_1` FOREIGN KEY (`departmentId`) REFERENCES `department` (`departmentId`) ON DELETE CASCADE ON UPDATE CASCADE,
  ADD CONSTRAINT `faculty_ibfk_2` FOREIGN KEY (`schoolId`) REFERENCES `school` (`schoolId`) ON DELETE CASCADE ON UPDATE CASCADE,
  ADD CONSTRAINT `faculty_ibfk_3` FOREIGN KEY (`institutionId`) REFERENCES `institution` (`institutionId`) ON DELETE CASCADE ON UPDATE CASCADE;

--
-- Constraints for table `faculty_book`
--
ALTER TABLE `faculty_book`
  ADD CONSTRAINT `bookId_constraint` FOREIGN KEY (`bookId`) REFERENCES `book` (`bookId`) ON DELETE CASCADE ON UPDATE CASCADE,
  ADD CONSTRAINT `facultyId_constraint` FOREIGN KEY (`facultyId`) REFERENCES `faculty` (`facultyId`) ON DELETE CASCADE ON UPDATE CASCADE;

--
-- Constraints for table `faculty_journal`
--
ALTER TABLE `faculty_journal`
  ADD CONSTRAINT `fac_constraint` FOREIGN KEY (`facultyId`) REFERENCES `faculty` (`facultyId`) ON DELETE CASCADE ON UPDATE CASCADE,
  ADD CONSTRAINT `journal_constraint` FOREIGN KEY (`journalId`) REFERENCES `journal` (`journalId`) ON DELETE CASCADE ON UPDATE CASCADE;

--
-- Constraints for table `faculty_presentation`
--
ALTER TABLE `faculty_presentation`
  ADD CONSTRAINT `presentation_facultyId` FOREIGN KEY (`facultyId`) REFERENCES `faculty` (`facultyId`) ON DELETE CASCADE ON UPDATE CASCADE,
  ADD CONSTRAINT `presentation_presentationId` FOREIGN KEY (`presentationId`) REFERENCES `presentation` (`presentationId`) ON DELETE CASCADE ON UPDATE CASCADE;

--
-- Constraints for table `faculty_research`
--
ALTER TABLE `faculty_research`
  ADD CONSTRAINT `fac2_constraint` FOREIGN KEY (`facultyId`) REFERENCES `faculty` (`facultyId`) ON DELETE CASCADE ON UPDATE CASCADE,
  ADD CONSTRAINT `reseach_constraint` FOREIGN KEY (`researchId`) REFERENCES `research` (`researchId`) ON DELETE CASCADE ON UPDATE CASCADE;

--
-- Constraints for table `faculty_thesis`
--
ALTER TABLE `faculty_thesis`
  ADD CONSTRAINT `facaulty_constraint` FOREIGN KEY (`facultyId`) REFERENCES `faculty` (`facultyId`) ON DELETE CASCADE ON UPDATE CASCADE,
  ADD CONSTRAINT `thesis_constraint` FOREIGN KEY (`thesisId`) REFERENCES `thesis` (`thesisId`) ON DELETE CASCADE ON UPDATE CASCADE;

--
-- Constraints for table `institution`
--
ALTER TABLE `institution`
  ADD CONSTRAINT `fk_director` FOREIGN KEY (`directorId`) REFERENCES `faculty` (`facultyId`) ON DELETE NO ACTION ON UPDATE NO ACTION,
  ADD CONSTRAINT `fk_region` FOREIGN KEY (`region_id`) REFERENCES `region` (`region_id`) ON DELETE NO ACTION ON UPDATE NO ACTION;

--
-- Constraints for table `institution_department`
--
ALTER TABLE `institution_department`
  ADD CONSTRAINT `fk_chairman` FOREIGN KEY (`chairmanId`) REFERENCES `faculty` (`facultyId`) ON DELETE CASCADE ON UPDATE CASCADE,
  ADD CONSTRAINT `fk_depInstitution` FOREIGN KEY (`institutionId`) REFERENCES `institution` (`institutionId`) ON DELETE CASCADE ON UPDATE CASCADE,
  ADD CONSTRAINT `fk_depName` FOREIGN KEY (`departmentId`) REFERENCES `department` (`departmentId`) ON DELETE CASCADE ON UPDATE CASCADE,
  ADD CONSTRAINT `fk_depSchool` FOREIGN KEY (`schoolId`) REFERENCES `school` (`schoolId`) ON DELETE CASCADE ON UPDATE CASCADE;

--
-- Constraints for table `institution_program`
--
ALTER TABLE `institution_program`
  ADD CONSTRAINT `fk_dept` FOREIGN KEY (`departmentId`) REFERENCES `department` (`departmentId`) ON DELETE CASCADE ON UPDATE CASCADE,
  ADD CONSTRAINT `fk_inst` FOREIGN KEY (`institutionId`) REFERENCES `institution` (`institutionId`) ON DELETE CASCADE ON UPDATE CASCADE,
  ADD CONSTRAINT `fk_prog` FOREIGN KEY (`programId`) REFERENCES `program` (`programId`) ON DELETE CASCADE ON UPDATE CASCADE,
  ADD CONSTRAINT `fk_skl` FOREIGN KEY (`schoolId`) REFERENCES `school` (`schoolId`) ON DELETE CASCADE ON UPDATE CASCADE;

--
-- Constraints for table `institution_school`
--
ALTER TABLE `institution_school`
  ADD CONSTRAINT `fk_dean` FOREIGN KEY (`deanId`) REFERENCES `faculty` (`facultyId`) ON DELETE CASCADE ON UPDATE CASCADE,
  ADD CONSTRAINT `fk_institution` FOREIGN KEY (`institutionId`) REFERENCES `institution` (`institutionId`) ON DELETE CASCADE ON UPDATE CASCADE,
  ADD CONSTRAINT `fk_school` FOREIGN KEY (`schoolId`) REFERENCES `school` (`schoolId`) ON DELETE CASCADE ON UPDATE CASCADE;

--
-- Constraints for table `programdata`
--
ALTER TABLE `programdata`
  ADD CONSTRAINT `fk_department_1` FOREIGN KEY (`departmentId`) REFERENCES `department` (`departmentId`) ON DELETE NO ACTION ON UPDATE NO ACTION,
  ADD CONSTRAINT `fk_institution_1` FOREIGN KEY (`institutionId`) REFERENCES `institution` (`institutionId`) ON DELETE NO ACTION ON UPDATE NO ACTION,
  ADD CONSTRAINT `programdata_ibfk_1` FOREIGN KEY (`programId`) REFERENCES `program` (`programId`) ON DELETE NO ACTION ON UPDATE NO ACTION,
  ADD CONSTRAINT `programdata_ibfk_2` FOREIGN KEY (`schoolId`) REFERENCES `school` (`schoolId`) ON DELETE NO ACTION ON UPDATE NO ACTION;

--
-- Constraints for table `studentdata`
--
ALTER TABLE `studentdata`
  ADD CONSTRAINT `institution_Fk_1` FOREIGN KEY (`institutionId`) REFERENCES `institution` (`institutionId`) ON DELETE NO ACTION ON UPDATE NO ACTION,
  ADD CONSTRAINT `studentdata_ibfk_1` FOREIGN KEY (`departmentId`) REFERENCES `department` (`departmentId`) ON DELETE NO ACTION ON UPDATE NO ACTION,
  ADD CONSTRAINT `studentdata_ibfk_2` FOREIGN KEY (`schoolId`) REFERENCES `school` (`schoolId`) ON DELETE NO ACTION ON UPDATE NO ACTION;

/*!40101 SET CHARACTER_SET_CLIENT=@OLD_CHARACTER_SET_CLIENT */;
/*!40101 SET CHARACTER_SET_RESULTS=@OLD_CHARACTER_SET_RESULTS */;
/*!40101 SET COLLATION_CONNECTION=@OLD_COLLATION_CONNECTION */;
